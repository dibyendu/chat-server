package login

import (
	"app/database"
	"app/util"
	"app/util/mail"
	"bytes"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"github.com/dgrijalva/jwt-go"
	"github.com/gofrs/uuid"
	"github.com/kataras/iris"
	"golang.org/x/crypto/scrypt"
	"html/template"
	"io/ioutil"
	"net/http"
	"net/url"
	"strings"
	"time"
)

// global configuration constants
const (
	DISPOSABLE_EMAIL_CHECK_API          = "https://open.kickbox.com/v1/disposable/"
	RECAPTCHA_VERIFICATION_SAFE_SCORE   = 0.7 // max 1
	PASSWORD_RESET_LINK_EXPIRATION_TIME = 24  // hours
	ACCESS_TOKEN_EXPIRATION_DURATION    = 24  // hours
)

// HashPassword : function is used to create a hash of the password as
// hash(password + salt)
// http://ticki.github.io/blog/you-are-probably-doing-login-systems-wrong
func HashPassword(password string) (string, string, error) {
	salt := make([]byte, 16) // 16 bytes of cryptographically secure pseudorandom salt
	_, err := rand.Read(salt)
	if err != nil {
		return "", "", fmt.Errorf("password salt generation failed with error: %s", err)
	}

	passwordHash, err := scrypt.Key([]byte(password), salt, 1<<15, 8, 1, 64) // 64 bytes long hashed password
	if err != nil {
		return "", "", fmt.Errorf("password hashing failed with error: %s", err)
	}

	return base64.StdEncoding.EncodeToString(salt), base64.StdEncoding.EncodeToString(passwordHash), nil
}

func parseEmailTemplate(path, file string, data util.SM) (string, error) {
	mailTemplate, err := ioutil.ReadFile(path + "/" + file)
	if err != nil {
		return "", fmt.Errorf("Error reading the email template [%s]: %s", path+"/"+file, err)
	}
	t, err := template.New("Email Template").Parse(string(mailTemplate))
	if err != nil {
		return "", fmt.Errorf("Error parsing the email template [%s]: %s", path+"/"+file, err)
	}
	buffer := new(bytes.Buffer)
	if err = t.Execute(buffer, data); err != nil {
		return "", fmt.Errorf("Error executing the email template [%s]: %s", path+"/"+file, err)
	}
	return buffer.String(), nil
}

func beforeLoginGetHandler(ctx iris.Context) {

	ctx.ViewData("login", util.M{
		"social": []util.M{
			{"name": "google", "url": secret.Google.Auth},
			{"name": "facebook", "url": secret.Facebook.Auth},
			{"name": "yahoo", "url": secret.Yahoo.Auth},
			{"name": "github", "url": secret.Github.Auth},
			{"name": "microsoft", "url": secret.Microsoft.Auth},
		},
		"base_url":           (map[bool]string{true: "https://", false: ctx.Request().URL.Scheme})[ctx.Request().URL.Scheme == ""] + ctx.Host(),
		"recaptcha_site_key": secret.Google.Api.ReCAPTCHA.ClientKey,
	})

	ctx.Next()
}

func loginGetHandler(ctx iris.Context) {
	if cookieVal := ctx.GetCookie("error"); cookieVal != "" {
		ctx.ViewData("notification", util.M{"type": "error", "message": cookieVal})
		ctx.RemoveCookie("error", func(c *http.Cookie) {
			c.Path = "/login"
		})
	}
	if cookieVal := ctx.GetCookie("warn"); cookieVal != "" {
		ctx.ViewData("notification", util.M{"type": "warn", "message": cookieVal})
		ctx.RemoveCookie("warn", func(c *http.Cookie) {
			c.Path = "/login"
		})
	}
	if cookieVal := ctx.GetCookie("info"); cookieVal != "" {
		ctx.ViewData("notification", util.M{"type": "info", "message": cookieVal})
		if accessToken := ctx.GetCookie("access-token"); accessToken != "" {
			ctx.ViewData("access_token", accessToken)
			if redirectTo := ctx.GetCookie("redirect-to"); redirectTo != "" {
				ctx.ViewData("redirect_to", redirectTo)
				ctx.RemoveCookie("redirect-to", func(c *http.Cookie) {
					c.Path = "/login"
				})
			} else {
				ctx.ViewData("redirect_to", "")
			}
			ctx.RemoveCookie("access-token", func(c *http.Cookie) {
				c.Path = "/login"
			})
		}
		ctx.RemoveCookie("info", func(c *http.Cookie) {
			c.Path = "/login"
		})
	}
	ctx.View("login.html")
}

func loginPostHandler(ctx iris.Context) {

	start := time.Now()

	collection := db.Database.C("users")

	rqstType := ctx.PostValue("type")

	if rqstType == "login" {
		email, password := ctx.PostValue("email"), ctx.PostValue("password")
		var user db.M

		ctx.Application().Logger().Infof("login info: email = %s, password = %s", email, password)

		ctx.Values().Set("type", "error")
		if err := collection.Find(db.M{"email": email}).One(&user); err != nil {
			ctx.Values().Set("message", "User doesn't exist. Please register first.")
		} else if _, ok := user["client"]; ok {
			ctx.Values().Set("message", "This user has signed up using "+strings.ToUpper(user["client"].(string))+". Please sign in using the same.")
		} else {
			salt, _ := base64.StdEncoding.DecodeString(user["salt"].(string))
			passwordHash, err := scrypt.Key([]byte(password), salt, 1<<15, 8, 1, 64)
			if err != nil {
				ctx.Application().Logger().Errorf("password hashing failed with error: %s", err)
				ctx.Values().Set("message", "Login failure because of internal hashing error.")
			} else {
				if user["password"].(string) != base64.StdEncoding.EncodeToString(passwordHash) {
					ctx.Values().Set("message", "Incorrect password. Please reset the password in case if you forgot.")
				} else {
					token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
						"fname": user["fname"],
						"lname": user["lname"],
						"exp":   time.Now().Add(time.Hour * ACCESS_TOKEN_EXPIRATION_DURATION).Unix(),
					})
					tokenString, _ := token.SignedString([]byte(configuration.JWTSecret))

					ctx.Values().Set("type", "info")
					ctx.Values().Set("message", "Login successful. You are being redirected.")
					ctx.Values().Set("access-token", tokenString)
				}
			}
		}

		elapsed := time.Now().Sub(start)
		if elapsed < 2*time.Second {
			time.Sleep(2*time.Second - elapsed)
		}

		ctx.Next()
	} else {
		var respType, respMsg string

		captcha := ctx.PostValue("captcha")
		status, body, error := util.UrlFetch.Post(
			secret.Google.Api.ReCAPTCHA.Url,
			util.M{
				"secret":   secret.Google.Api.ReCAPTCHA.ServerKey,
				"response": captcha,
				"remoteip": ctx.GetHeader("X-Real-Ip"),
			},
			util.M{
				"Content-Type": "application/x-www-form-urlencoded",
			},
		)
		if status == 200 && error == nil {
			var captchaResponse = make(map[string]interface{})
			_ = json.Unmarshal(body, &captchaResponse)

			ctx.Application().Logger().Infof("reCaptcha verification response: %s", body)

			if !captchaResponse["success"].(bool) {
				respType, respMsg = "error", "reCaptcha verification result is unsuccessful."
			} else if captchaResponse["score"].(float64) < RECAPTCHA_VERIFICATION_SAFE_SCORE {
				respType, respMsg = "warn", "reCaptcha verification score is too low."
			} else {
				respType, respMsg = "", ""
			}
		} else {
			respType, respMsg = "error", "Failed to verify the reCaptcha token."
		}

		if respType == "" && respMsg == "" {
			if rqstType == "register" {
				firstName, lastName, email, password := ctx.PostValue("firstName"), ctx.PostValue("lastName"), ctx.PostValue("email"), ctx.PostValue("password")

				ctx.Application().Logger().Infof("register info: firstName = %s, lastName = %s, email = %s, password = %s", firstName, lastName, email, password)

				status, body, error := util.UrlFetch.Get(DISPOSABLE_EMAIL_CHECK_API+url.PathEscape(email), nil, nil)
				if status == 200 && error == nil {
					var disposableEmailResponse = make(util.M)
					_ = json.Unmarshal(body, &disposableEmailResponse)

					ctx.Application().Logger().Infof("disposable email response: %s", body)

					if disposableEmailResponse["disposable"].(bool) {
						respType, respMsg = "error", "Disposable email addresses are not allowed."
					} else {
						respType, respMsg = "", ""
					}
				} else {
					respType, respMsg = "error", "Failed to verify the email address."
				}

				if respType == "" && respMsg == "" {
					if count, err := collection.Find(db.M{"email": email}).Count(); err != nil {
						ctx.Application().Logger().Errorf("[%s] COUNT failed with error: %s", collection.FullName, err)
					} else {
						if count > 0 {
							respType, respMsg = "error", "This email is already registered."
						} else {
							verificationID := uuid.Must(uuid.NewV4()).String()
							verificationURL := "https://" + ctx.Subdomain() + ctx.Host() + ctx.Path() + "/verify/" + verificationID
							salt, passwordHash, err := HashPassword(password)
							if err != nil {
								ctx.Application().Logger().Error(err)
								respType, respMsg = "error", "Registration failure because of internal hashing error."
							} else {
								if err := collection.Insert(db.M{"fname": firstName, "lname": lastName, "email": email, "salt": salt, "password": passwordHash, "created_at": int64(time.Now().Unix()), "verification": db.M{"is_verified": false, "id": verificationID}}); err != nil {
									ctx.Application().Logger().Errorf("[%s] INSERT failed with error: %s", collection.FullName, err)
									respType, respMsg = "error", "Registration failure bacause of database error."
								} else {
									htmlEmail, err := parseEmailTemplate(ctx.Values().GetString("email-template-path"), "activate.email", util.SM{
										"username": strings.Title(firstName) + " " + strings.Title(lastName),
										"url":      verificationURL,
									})
									if err != nil {
										ctx.Application().Logger().Error(err)
										htmlEmail = ""
									}
									mail.Send(
										firstName,
										lastName,
										email,
										"Activate your email address for Login App",
										"Hi "+strings.Title(firstName)+",\nPlease click the following link to activate your profile:\n\n"+verificationURL+"\n\nIf you haven't made this request, please ignore this email.\nThanks",
										htmlEmail,
									)
									respType, respMsg = "info", "Profile activation link is sent to your email."
								}
							}
						}
					}
				}
			} else if rqstType == "reset" {
				email := ctx.PostValue("email")
				ctx.Application().Logger().Infof("reset pass info: email = %s", email)

				var user db.M
				if err := collection.Find(db.M{"email": email}).One(&user); err != nil {
					ctx.Application().Logger().Errorf("[%s] FIND failed with error: %s", collection.FullName, err)
					respType, respMsg = "error", "This email is not registered. Please create an account first."
				} else {
					resetID := uuid.Must(uuid.NewV4()).String()
					resetURL := "https://" + ctx.Subdomain() + ctx.Host() + ctx.Path() + "/reset/" + resetID

					if err := collection.Update(db.M{"email": email}, db.M{"$set": db.M{"password_reset.id": resetID, "password_reset.generated_at": int64(time.Now().Unix())}}); err != nil {
						ctx.Application().Logger().Errorf("[%s] UPDATE failed with error: %s", collection.FullName, err)
						respType, respMsg = "error", "Password reset failure bacause of database error."
					} else {
						htmlEmail, err := parseEmailTemplate(ctx.Values().GetString("email-template-path"), "password-reset.email", util.SM{
							"username": strings.Title(user["fname"].(string)) + " " + strings.Title(user["lname"].(string)),
							"url":      resetURL,
						})
						if err != nil {
							ctx.Application().Logger().Error(err)
							htmlEmail = ""
						}
						mail.Send(
							user["fname"].(string),
							user["lname"].(string),
							email,
							"Reset the password for your account on Login App",
							"Hi "+user["fname"].(string)+",\nPlease click the following link to reset your password:\n\n"+resetURL+"\n\nIf you haven't made this request, please ignore this email.\nThanks",
							htmlEmail,
						)
						respType, respMsg = "info", "Password reset link is sent to your email."
					}
				}
			}
		}

		elapsed := time.Now().Sub(start)
		if elapsed < 2*time.Second {
			time.Sleep(2*time.Second - elapsed)
		}

		ctx.JSON(iris.Map{"type": respType, "message": respMsg})
	}
}

func afterLoginPostHandler(ctx iris.Context) {
	msgType, message, accessToken := ctx.Values().GetString("type"), ctx.Values().GetString("message"), ctx.Values().GetString("access-token")

	if accessToken != "" {
		ctx.JSON(iris.Map{"type": msgType, "message": message, "access-token": accessToken})
	} else {
		ctx.JSON(iris.Map{"type": msgType, "message": message})
	}
}

func beforeSocialLoginHandler(ctx iris.Context) {
	ctx.Values().Set("secret", &secret)
	ctx.Values().Set("csrf", configuration.CSRFToken)
	ctx.Next()
}

func afterSocialLoginHandler(ctx iris.Context) {
	user := make(map[string]string)
	_ = json.Unmarshal(ctx.Values().Get("user-info").([]byte), &user)

	collection := db.Database.C("users")

	var (
		data              db.M
		respType, respMsg string
	)

	firstName, lastName, email, id, agent := user["first_name"], user["last_name"], user["email"], user["id"], user["agent"]
	pictureUrl, pictureData := "", ""
	var ok bool
	if pictureUrl, ok = user["picture_url"]; !ok {
		pictureData = user["picture_data"]
	}

	ctx.Application().Logger().Infof("social media sign in info: agent = %s, firstName = %s, lastName = %s, email = %s, id = %s, pictureUrl = %s, pictureData = %s", agent, firstName, lastName, email, id, pictureUrl, pictureData)

	if err := collection.Find(db.M{"email": email}).One(&data); err != nil {
		if err := collection.Insert(db.M{"fname": firstName, "lname": lastName, "email": email, "client-id": id, "picture-url": pictureUrl, "picture-data": pictureData, "client": agent, "created_at": int64(time.Now().Unix())}); err != nil {
			ctx.Application().Logger().Errorf("[%s] INSERT failed with error: %s", collection.FullName, err)
			respType, respMsg = "error", "Sign in failure bacause of database error."
		} else {
			respType, respMsg = "info", "Successfully signed up using "+strings.ToUpper(agent)+". You are being redirected."
		}
	} else {
		if _, ok := data["client"]; ok {
			respType, respMsg = "info", "Successfully signed in using "+strings.ToUpper(agent)+". You are being redirected."
		} else {
			respType, respMsg = "error", "An account already exists with this email: "+email+". Please reset the password in case you forgot it."
		}
	}

	if respType != "error" {
		token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
			"fname": firstName,
			"lname": lastName,
			"exp":   time.Now().Add(time.Hour * ACCESS_TOKEN_EXPIRATION_DURATION).Unix(),
		})
		tokenString, _ := token.SignedString([]byte(configuration.JWTSecret))
		ctx.SetCookieKV("access-token", tokenString, func(c *http.Cookie) {
			c.Path = "/login"
		})
		ctx.SetCookieKV("info", respMsg, func(c *http.Cookie) {
			c.Path = "/login"
		})
	} else {
		ctx.SetCookieKV("error", respMsg, func(c *http.Cookie) {
			c.Path = "/login"
		})
	}
	ctx.Redirect("/login")
}

func verifyGetHandler(ctx iris.Context) {
	id := ctx.Params().Get("id")

	collection := db.Database.C("users")
	var user db.M
	if err := collection.Find(db.M{"verification.id": id}).One(&user); err != nil {
		ctx.Application().Logger().Errorf("[%s] FIND failed with error: %s", collection.FullName, err)
		ctx.SetCookieKV("error", "The verification link is invalid, please sign up again.", func(c *http.Cookie) {
			c.Path = "/login"
		})
	} else {
		if user["verification"].(db.M)["is_verified"].(bool) {
			ctx.SetCookieKV("warn", "Account is already verified, please login to continue.", func(c *http.Cookie) {
				c.Path = "/login"
			})
		} else {
			if err := collection.Update(db.M{"verification.id": id}, db.M{"$set": db.M{"verification.is_verified": true}, "$unset": db.M{"verification.id": ""}}); err != nil {
				ctx.Application().Logger().Errorf("[%s] UPDATE failed with error: %s", collection.FullName, err)
				ctx.SetCookieKV("error", "Verification failed because of database error.", func(c *http.Cookie) {
					c.Path = "/login"
				})
			} else {
				ctx.SetCookieKV("info", "Email: "+user["email"].(string)+" is successfully verified.", func(c *http.Cookie) {
					c.Path = "/login"
				})
			}
		}
	}
	ctx.Redirect("/login")
}

func resetPassGetHandler(ctx iris.Context) {
	id := ctx.Params().Get("id")

	collection := db.Database.C("users")
	var user db.M
	if err := collection.Find(db.M{"password_reset.id": id}).One(&user); err != nil {
		ctx.Application().Logger().Errorf("[%s] FIND failed with error: %s", collection.FullName, err)
		ctx.SetCookieKV("error", "This link has already been used once, please make a new request.", func(c *http.Cookie) {
			c.Path = "/login"
		})
		ctx.Redirect("/login")
	} else {
		if (int64(time.Now().Unix()) - user["password_reset"].(db.M)["generated_at"].(int64)) > PASSWORD_RESET_LINK_EXPIRATION_TIME*3600 {
			ctx.SetCookieKV("error", "The password reset link has been expired, please make a new request.", func(c *http.Cookie) {
				c.Path = "/login"
			})
			ctx.Redirect("/login")
		} else {
			ctx.View("password-reset.html")
		}
	}
}

func resetPassPostHandler(ctx iris.Context) {
	start := time.Now()
	id := ctx.Params().Get("id")
	password := ctx.PostValue("password")
	ctx.Application().Logger().Infof("new password = %s", password)
	collection := db.Database.C("users")
	var (
		user              db.M
		respType, respMsg string
	)
	if err := collection.Find(db.M{"password_reset.id": id}).One(&user); err != nil {
		ctx.Application().Logger().Errorf("[%s] FIND failed with error: %s", collection.FullName, err)
		respType, respMsg = "error", "This link has already been used once, please make a new request."
	} else {
		if (int64(time.Now().Unix()) - user["password_reset"].(db.M)["generated_at"].(int64)) > PASSWORD_RESET_LINK_EXPIRATION_TIME*3600 {
			respType, respMsg = "error", "The password reset link has been expired, please make a new request."
		} else {
			salt, passwordHash, err := HashPassword(password)
			if err != nil {
				ctx.Application().Logger().Error(err)
				respType, respMsg = "error", "Password reset failed because of internal hashing error."
			} else {
				if err := collection.Update(db.M{"email": user["email"]}, db.M{"$set": db.M{"salt": salt, "password": passwordHash}, "$unset": db.M{"password_reset": ""}}); err != nil {
					ctx.Application().Logger().Errorf("[%s] UPDATE failed with error: %s", collection.FullName, err)
					respType, respMsg = "error", "Password reset failed because of database error."
				} else {
					respType, respMsg = "info", "Password has been changed successfully."
				}
			}
		}
	}
	elapsed := time.Now().Sub(start)
	if elapsed < 2*time.Second {
		time.Sleep(2*time.Second - elapsed)
	}
	ctx.JSON(iris.Map{"type": respType, "message": respMsg})
}
