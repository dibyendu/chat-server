package social

import (
	"app/util"
	"encoding/json"
	"github.com/kataras/iris"
	"net/http"
	"strings"
)

// GithubAuthHandler : callback to handle signin using Github
func GithubAuthHandler(ctx iris.Context) {

	code, ok := getCode("Github", ctx)
	if !ok {
		return
	}

	secret := ctx.Values().Get("secret").(*ClientSecret)

	body := map[string]interface{}{
		"code":          code,
		"client_id":     secret.Github.Auth.QueryParams.ClientID,
		"client_secret": secret.Github.Token.ClientSecret,
	}
	header := map[string]interface{}{
		"Accept": "application/json",
	}
	type TokenResponseT struct {
		Access string `json:"access_token"`
		Type   string `json:"token_type"`
		Scope  string
	}
	var token = TokenResponseT{}

	ok = getToken("Github", "GET", secret.Github.Token.Url, body, header, &token, ctx)
	if !ok {
		return
	}

	if !strings.Contains(token.Scope, "user:email") {
		ctx.Application().Logger().Warn("github email permission declined")
		ctx.SetCookieKV("warn", "Github: Please enable the Email permission", func(c *http.Cookie) {
			c.Path = "/login"
		})
		ctx.Redirect("/login")
		return
	}

	c := make(chan util.ResponseT)
	go func() {
		status, response, err := util.UrlFetch.Get(secret.Github.Api.Email, nil, map[string]interface{}{
			"Authorization": "token " + token.Access,
			"X-Oauth-Scope": "user:email",
		})
		c <- util.ResponseT{status, response, err}
	}()

	data, ok := getUserInfo("Github", secret.Github.Api.Url, nil, map[string]interface{}{
		"Authorization": "token " + token.Access,
	}, ctx)
	if !ok {
		return
	}

	emailResp := <-c
	if emailResp.Error != nil {
		handleResponseError(
			&emailResp,
			"Github: email url fetching failed: "+emailResp.Error.Error(),
			"Github: Could NOT fetch email url",
			"Github: email response parsing failed: "+emailResp.Error.Error(),
			"Github: Could NOT parse email response",
			ctx,
		)
		return
	}
	email := make([]map[string]interface{}, 10)
	_ = json.Unmarshal(emailResp.Body, &email)

	data = parseUserInfo(data, &map[string]string{
		"id":         "id",
		"first":      "first_name",
		"last":       "last_name",
		"avatar_url": "picture_url",
		"email":      "email",
		"agent":      "agent",
	}, func(data *map[string]interface{}) {
		if (*data)["name"] != nil {
			names := strings.Split((*data)["name"].(string), " ")
			(*data)["first"], (*data)["last"] = names[0], names[1]
		} else {
			(*data)["first"], (*data)["last"] = "", ""
		}
		for _, v := range email {
			if v["primary"].(bool) {
				(*data)["email"] = v["email"]
			}
		}
		(*data)["agent"] = "github"
	})

	ctx.Values().Set("user-info", data)
	ctx.Next()
}
