package login

import (
	"app/configuration"
	"app/handlers/login/social"
	"github.com/kataras/iris"
	"github.com/kataras/iris/view"
	"gopkg.in/yaml.v2"
	"io/ioutil"
	"os"
	"reflect"
	"strings"
)

var (
	secretFilePath = "app/handlers/login/social/client-secret.yaml"
	secret         = social.ClientSecret{}
	configuration  = conf.Get()
)

// SetRoutes : set all routes for the login page
func SetRoutes(app *iris.Application, htmlTemplate *view.HandlebarsEngine, emailTemplatePath string) *iris.Application {

	gopath := os.Getenv("GOPATH")

	raw, err := ioutil.ReadFile(gopath + "/src/" + secretFilePath)
	if err != nil {
		app.Logger().Error(err)
	}

	if err := yaml.Unmarshal(raw, &secret); err != nil {
		app.Logger().Error(err)
	}

	// register a custom template func.
	htmlTemplate.AddFunc("build_url", func(base_url string, auth social.Auth) string {

		v, t := reflect.ValueOf(auth.QueryParams), reflect.TypeOf(auth.QueryParams)

		query := ""
		for i := 0; i < v.NumField(); i++ {

			if v.Field(i).Interface() == "" {
				continue
			}

			query += strings.ToLower(t.Field(i).Name) + "="
			if t.Field(i).Name == "Scope" {
				if auth.Separator != "" {
					query += strings.Join(v.Field(i).Interface().([]string), auth.Separator)
				} else {
					query += strings.Join(v.Field(i).Interface().([]string), "")
				}
			} else if t.Field(i).Name == "RedirectURI" {
				query += base_url + v.Field(i).Interface().(string)
			} else {
				query += v.Field(i).Interface().(string)
			}
			query += "&"
		}
		query += "state=" + configuration.CSRFToken
		return auth.Url + "?" + query
	})

	app.Get("/login", beforeLoginGetHandler, loginGetHandler)

	/*
		 * if the request header, Content-Type: application/x-www-form-urlencoded
		 * is present, we can use ctx.PostValue("key")
		 * otherwise, if the header is, Content-Type: application/json
		 * ctx.ReadJSON() has to be used as follows:
			data := struct {
				Type  string	// fields must be capitalized or `json:"key"` annotated
				Email  string
				Password string
			}{}
			err := ctx.ReadJSON(&data)
	*/
	app.Post("/login", func(ctx iris.Context) {
		ctx.Values().Set("email-template-path", emailTemplatePath)
		ctx.Next()
	}, loginPostHandler, afterLoginPostHandler)

	app.Get("/login/verify/{id}", verifyGetHandler)
	app.Get("/login/reset/{id}", resetPassGetHandler)
	app.Post("/login/reset/{id}", resetPassPostHandler)

	app.PartyFunc("/auth", func(auth iris.Party) {

		auth.Use(beforeSocialLoginHandler)
		auth.Done(afterSocialLoginHandler)

		auth.Get("/google", social.GoogleAuthHandler)
		auth.Get("/facebook", social.FacebookAuthHandler)
		auth.Get("/github", social.GithubAuthHandler)
		auth.Get("/yahoo", social.YahooAuthHandler)
		auth.Get("/microsoft", social.MicrosoftAuthHandler)
	})
	return app
}
