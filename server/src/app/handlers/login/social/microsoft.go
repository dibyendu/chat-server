package social

import (
	"app/util"
	"encoding/base64"
	"encoding/json"
	"github.com/kataras/iris"
)

// MicrosoftAuthHandler : callback to handle signin using Microsoft
func MicrosoftAuthHandler(ctx iris.Context) {

	code, ok := getCode("Microsoft", ctx)
	if !ok {
		return
	}

	secret := ctx.Values().Get("secret").(*ClientSecret)
	baseURL := (map[bool]string{true: "https://", false: ctx.Request().URL.Scheme})[ctx.Request().URL.Scheme == ""] + ctx.Host()

	body := map[string]interface{}{
		"code":          code,
		"redirect_uri":  baseURL + secret.Microsoft.Auth.QueryParams.RedirectURI,
		"client_id":     secret.Microsoft.Auth.QueryParams.ClientID,
		"grant_type":    "authorization_code",
		"client_secret": secret.Microsoft.Token.ClientSecret,
	}
	header := map[string]interface{}{
		"Content-Type": "application/x-www-form-urlencoded",
	}
	var token = struct {
		Access string `json:"access_token"`
	}{}

	ok = getToken("Microsoft", "POST", secret.Microsoft.Token.Url, body, header, &token, ctx)
	if !ok {
		return
	}

	dataC, metaC := make(chan util.ResponseT), make(chan util.ResponseT)
	go func() {
		status, response, err := util.UrlFetch.Get(
			secret.Microsoft.Api.Picture.MetaURL,
			nil,
			map[string]interface{}{"Authorization": "Bearer " + token.Access},
		)
		metaC <- util.ResponseT{status, response, err}
	}()
	go func() {
		status, response, err := util.UrlFetch.Get(
			secret.Microsoft.Api.Picture.Url,
			nil,
			map[string]interface{}{"Authorization": "Bearer " + token.Access},
		)
		dataC <- util.ResponseT{status, response, err}
	}()

	data, ok := getUserInfo("Microsoft", secret.Microsoft.Api.UserInfo.Url, nil, map[string]interface{}{
		"Authorization": "Bearer " + token.Access,
	}, ctx)
	if !ok {
		return
	}

	pictureMetaResp, pictureResp := <-metaC, <-dataC
	if pictureMetaResp.Error != nil {
		handleResponseError(
			&pictureMetaResp,
			"Microsoft: picture metadata url fetching failed: "+pictureMetaResp.Error.Error(),
			"Microsoft: Could NOT fetch picture metadata url",
			"Microsoft: picture metadata response parsing failed: "+pictureMetaResp.Error.Error(),
			"Microsoft: Could NOT parse picture metadata response",
			ctx,
		)
		return
	}
	if pictureResp.Error != nil {
		handleResponseError(
			&pictureResp,
			"Microsoft: picture url fetching failed: "+pictureResp.Error.Error(),
			"Microsoft: Could NOT fetch picture url",
			"Microsoft: picture response parsing failed: "+pictureResp.Error.Error(),
			"Microsoft: Could NOT parse picture response",
			ctx,
		)
		return
	}
	pictureMetaData := struct {
		Type   string `json:"@odata.mediaContentType"`
		Width  int
		Height int
	}{}
	_ = json.Unmarshal(pictureMetaResp.Body, &pictureMetaData)
	imageData := base64.StdEncoding.EncodeToString(pictureResp.Body)

	data = parseUserInfo(data, &map[string]string{
		"id":        "id",
		"givenName": "first_name",
		"surname":   "last_name",
		"picture":   "picture_data",
		"email":     "email",
		"agent":     "agent",
	}, func(data *map[string]interface{}) {
		if (*data)["mail"] != nil {
			(*data)["email"] = (*data)["mail"]
		} else {
			(*data)["email"] = (*data)["userPrincipalName"]
		}
		(*data)["picture"] = (map[bool]string{true: "", false: "data:" + pictureMetaData.Type + ";base64," + imageData})[pictureMetaData.Type == ""]
		(*data)["agent"] = "microsoft"
	})

	ctx.Values().Set("user-info", data)
	ctx.Next()
}
