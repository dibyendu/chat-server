package social

import (
	"app/util"
	"encoding/json"
	"github.com/kataras/iris"
	"net/http"
	"reflect"
	"strings"
)

// FacebookAuthHandler : callback to handle signin using Facebook
func FacebookAuthHandler(ctx iris.Context) {

	code, ok := getCode("Facebook", ctx)
	if !ok {
		return
	}

	secret := ctx.Values().Get("secret").(*ClientSecret)
	baseURL := (map[bool]string{true: "https://", false: ctx.Request().URL.Scheme})[ctx.Request().URL.Scheme == ""] + ctx.Host()

	params := map[string]interface{}{
		"client_id":     secret.Facebook.Auth.QueryParams.ClientID,
		"redirect_uri":  baseURL + secret.Facebook.Auth.QueryParams.RedirectURI,
		"client_secret": secret.Facebook.Token.ClientSecret,
		"code":          code,
	}
	type TokenResponseT struct {
		Access  string `json:"access_token"`
		Type    string `json:"token_type"`
		Expires int    `json:"expires_in"`
	}
	var token = TokenResponseT{}

	ok = getToken("Facebook", "GET", secret.Facebook.Token.Url, params, nil, &token, ctx)
	if !ok {
		return
	}

	_, response, _ := util.UrlFetch.Get(secret.Facebook.Api.Permission.Url, map[string]interface{}{
		"access_token": token.Access,
	}, nil)

	type PermissionData struct {
		Data []struct {
			Permission string
			Status     string
		}
	}
	permission := PermissionData{}
	_ = json.Unmarshal(response, &permission)

	_ = util.GenericMap(permission.Data, func(p struct {
		Permission string
		Status     string
	}) interface{} {
		if p.Permission == "email" && p.Status == "declined" {
			ctx.Application().Logger().Warn("facebook email permission declined")
			ctx.SetCookieKV("warn", "Facebook: Please enable the Email permission", func(c *http.Cookie) {
				c.Path = "/login"
			})
			ctx.Redirect("/login")
		}
		return nil
	})

	c := make(chan util.ResponseT)
	go func() {
		payload := map[string]interface{}{"access_token": token.Access}
		v, t := reflect.ValueOf(secret.Facebook.Api.Picture.Query), reflect.TypeOf(secret.Facebook.Api.Picture.Query)
		for i := 0; i < v.NumField(); i++ {
			payload[strings.ToLower(t.Field(i).Name)] = v.Field(i).Interface()
		}
		status, response, err := util.UrlFetch.Get(secret.Facebook.Api.Picture.Url, payload, nil)
		c <- util.ResponseT{status, response, err}
	}()

	data, ok := getUserInfo("Facebook", secret.Facebook.Api.Info.Url, map[string]interface{}{
		"access_token": token.Access,
		"fields":       strings.Join(secret.Facebook.Api.Info.Fields, ","),
	}, nil, ctx)
	if !ok {
		return
	}

	pictureResp := <-c
	if pictureResp.Error != nil {
		handleResponseError(
			&pictureResp,
			"Facebook: picture url fetching failed: "+pictureResp.Error.Error(),
			"Facebook: Could NOT fetch picture url",
			"Facebook: picture response parsing failed: "+pictureResp.Error.Error(),
			"Facebook: Could NOT parse picture response",
			ctx,
		)
		return
	}

	picDataJSON := struct {
		Data struct {
			IsSilhouette bool
			URL          string
		}
	}{}
	_ = json.Unmarshal(pictureResp.Body, &picDataJSON)

	data = parseUserInfo(data, &map[string]string{
		"id":         "id",
		"first_name": "first_name",
		"last_name":  "last_name",
		"picture":    "picture_url",
		"email":      "email",
		"agent":      "agent",
	}, func(data *map[string]interface{}) {
		(*data)["picture"] = (map[bool]string{true: "", false: picDataJSON.Data.URL})[picDataJSON.Data.IsSilhouette]
		(*data)["agent"] = "facebook"
	})

	ctx.Values().Set("user-info", data)
	ctx.Next()
}
