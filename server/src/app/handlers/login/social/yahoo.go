package social

import "github.com/kataras/iris"

// YahooAuthHandler : callback to handle signin using Yahoo
func YahooAuthHandler(ctx iris.Context) {

	code, ok := getCode("Yahoo", ctx)
	if !ok {
		return
	}

	secret := ctx.Values().Get("secret").(*ClientSecret)
	baseURL := (map[bool]string{true: "https://", false: ctx.Request().URL.Scheme})[ctx.Request().URL.Scheme == ""] + ctx.Host()

	body := map[string]interface{}{
		"code":          code,
		"redirect_uri":  baseURL + secret.Yahoo.Auth.QueryParams.RedirectURI,
		"client_id":     secret.Yahoo.Auth.QueryParams.ClientID,
		"grant_type":    "authorization_code",
		"client_secret": secret.Yahoo.Token.ClientSecret,
	}
	header := map[string]interface{}{
		"Content-Type": "application/x-www-form-urlencoded",
	}
	var token = struct {
		Access  string `json:"access_token"`
		Type    string `json:"token_type"`
		Expires int    `json:"expires_in"`
		Refresh string `json:"refresh_token"`
		Guid    string `json:"xoauth_yahoo_guid"`
	}{}

	ok = getToken("Yahoo", "POST", secret.Yahoo.Token.Url, body, header, &token, ctx)
	if !ok {
		return
	}

	data, ok := getUserInfo("Yahoo", secret.Yahoo.Api.UserURL, map[string]interface{}{
		"format": "json",
	}, map[string]interface{}{
		"Authorization": "Bearer " + token.Access,
	}, ctx)
	if !ok {
		return
	}

	data = parseUserInfo(data, &map[string]string{
		"guid":       "id",
		"givenName":  "first_name",
		"familyName": "last_name",
		"picture":    "picture_url",
		"email":      "email",
		"agent":      "agent",
	}, func(data *map[string]interface{}) {
		*data = (*data)["profile"].(map[string]interface{})
		for _, email := range (*data)["emails"].([]interface{}) {
			if email.(map[string]interface{})["primary"].(bool) {
				(*data)["email"] = email.(map[string]interface{})["handle"]
				break
			}
		}
		(*data)["picture"] = (*data)["image"].(map[string]interface{})["imageUrl"]
		(*data)["agent"] = "yahoo"
	})

	ctx.Values().Set("user-info", data)
	ctx.Next()
}
