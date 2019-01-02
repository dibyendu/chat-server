package social

import "github.com/kataras/iris"

// GoogleAuthHandler : callback to handle signin using Google
func GoogleAuthHandler(ctx iris.Context) {

	code, ok := getCode("Google", ctx)
	if !ok {
		return
	}

	secret := ctx.Values().Get("secret").(*ClientSecret)
	baseURL := (map[bool]string{true: "https://", false: ctx.Request().URL.Scheme})[ctx.Request().URL.Scheme == ""] + ctx.Host()

	body := map[string]interface{}{
		"code":          code,
		"redirect_uri":  baseURL + secret.Google.Auth.QueryParams.RedirectURI,
		"client_id":     secret.Google.Auth.QueryParams.ClientID,
		"grant_type":    "authorization_code",
		"client_secret": secret.Google.Token.ClientSecret,
	}
	header := map[string]interface{}{
		"Content-Type": "application/x-www-form-urlencoded",
	}
	var token = struct {
		Access  string `json:"access_token"`
		Id      string `json:"id_token"`
		Type    string `json:"token_type"`
		Expires int    `json:"expires_in"`
	}{}

	ok = getToken("Google", "POST", secret.Google.Token.Url, body, header, &token, ctx)
	if !ok {
		return
	}

	data, ok := getUserInfo("Google", secret.Google.Api.UserURL, nil, map[string]interface{}{
		"Authorization": "Bearer " + token.Access,
	}, ctx)
	if !ok {
		return
	}

	data = parseUserInfo(data, &map[string]string{
		"sub":         "id",
		"given_name":  "first_name",
		"family_name": "last_name",
		"picture":     "picture_url",
		"email":       "email",
		"agent":       "agent",
	}, func(data *map[string]interface{}) {
		(*data)["agent"] = "google"
	})

	ctx.Values().Set("user-info", data)
	ctx.Next()
}
