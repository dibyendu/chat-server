package auth

import (
	"app/configuration"
	"app/util"
	"fmt"
	"github.com/dgrijalva/jwt-go"
	jwtmiddleware "github.com/iris-contrib/middleware/jwt"
	"github.com/kataras/iris"
	"net/http"
)

// Phase1 : authorization middleware number 1
func Phase1(ctx iris.Context) {
	jwtHandler := jwtmiddleware.New(jwtmiddleware.Config{
		Extractor: jwtmiddleware.FromFirst(
			jwtmiddleware.FromAuthHeader, // fetch the token from header (usually API calls)
			func(ctx iris.Context) (string, error) { // fetch the token from cookie (usually browser based page navigation)
				if token := ctx.GetCookie("authorization"); token != "" {
					return token, nil
				}
				return "", fmt.Errorf("Required authorization token not found")
			},
		),
		ValidationKeyGetter: func(token *jwt.Token) (interface{}, error) {
			return []byte(conf.Get().JWTSecret), nil
		},
		ErrorHandler: func(ctx iris.Context, error string) {
			ctx.Values().Set("error", error)
			ctx.Next()
		},
		SigningMethod: jwt.SigningMethodHS256,
		Expiration:    true,
		ContextKey:    "token",
	})
	jwtHandler.Serve(ctx)
}

// Phase2 : authorization middleware number 2
func Phase2(ctx iris.Context) {
	error := ctx.Values().GetString("error")
	var errorMsg string
	if error != "" {
		errorMsg = error + ", please sign in to get a new one."
	} else {
		token := ctx.Values().Get("token").(*jwt.Token)
		if claims, ok := token.Claims.(jwt.MapClaims); ok && token.Valid {
			ctx.Values().Set("user", util.SM{"fname": claims["fname"].(string), "lname": claims["lname"].(string)})
			errorMsg = ""
		} else {
			errorMsg = "Invalid authorization token, please sign in to get a fresh one."
		}
	}
	if errorMsg != "" {
		ctx.SetCookieKV("warn", errorMsg, func(c *http.Cookie) {
			c.Path = "/login"
		})
		ctx.SetCookieKV("redirect-to", ctx.Path(), func(c *http.Cookie) {
			c.Path = "/login"
		})
		ctx.Redirect("/login")
	} else {
		ctx.Next()
	}
}
