package social

import (
	"app/util"
	"encoding/json"
	"github.com/kataras/iris"
	"net/http"
)

/*
type Cookie struct {
	Name			string
	Value			string

	// optional
	Path			string
	Domain			string
	Expires			time.Time
	RawExpires		string		// for reading cookies only

	// MaxAge=0 means no 'Max-Age' attribute specified.
	// MaxAge<0 means delete cookie now, equivalently 'Max-Age: 0'
	// MaxAge>0 means Max-Age attribute present and given in seconds
	MaxAge			int
	Secure			bool
	HttpOnly		bool
	Raw				string
	Unparsed		[]string	// Raw text of unparsed attribute-value pairs
}

cookieLife := time.Duration(120) * time.Minute
c := &http.Cookie{
	Name: "key",
	Value: url.QueryEscape("value"),
	HttpOnly: true,
	Expires: time.Now().Add(cookieLife),
	Path: "/",
	MaxAge: int(cookieLife.Seconds()),
}
ctx.SetCookie(c)
*/

func getCode(agent string, ctx iris.Context) (string, bool) {
	vals := ctx.URLParams()
	_, ok := vals["error"]
	if ok {
		ctx.SetCookieKV("warn", agent+": Permission denied", func(c *http.Cookie) {
			c.Path = "/login"
		})
		ctx.Redirect("/login")
		return "", false
	}
	csrfToken, code := vals["state"], vals["code"]
	csrf := ctx.Values().GetString("csrf")
	if csrfToken != csrf {
		ctx.SetCookieKV("error", agent+": CSRF token does NOT match", func(c *http.Cookie) {
			c.Path = "/login"
		})
		ctx.Redirect("/login")
		return "", false
	}
	return code, true
}

func handleResponseError(response *util.ResponseT, fetchErrMsg, fetchCookieVal, parseErrMsg, parseCookieVal string, ctx iris.Context) {
	if response.Status == -1 {
		ctx.Application().Logger().Error(fetchErrMsg)
		ctx.SetCookieKV("error", fetchCookieVal, func(c *http.Cookie) {
			c.Path = "/login"
		})
	} else {
		ctx.Application().Logger().Error(parseErrMsg)
		ctx.SetCookieKV("error", parseCookieVal, func(c *http.Cookie) {
			c.Path = "/login"
		})
	}
	ctx.Redirect("/login")
}

func getToken(agent, method, tokenURL string, params, header util.M, token interface{}, ctx iris.Context) bool {
	var response util.ResponseT
	if method == "GET" {
		response.Status, response.Body, response.Error = util.UrlFetch.Get(tokenURL, params, header)
	} else if method == "POST" {
		response.Status, response.Body, response.Error = util.UrlFetch.Post(tokenURL, params, header)
	}
	if response.Error != nil {
		handleResponseError(
			&response,
			agent+": toekn url fetching failed: "+response.Error.Error(),
			agent+": Could NOT fetch Oauth token url",
			agent+": token response parsing failed: "+response.Error.Error(),
			agent+": Could NOT parse Oauth token response",
			ctx,
		)
		return false
	} else if response.Status != http.StatusOK {
		var tokenError = struct {
			Error       string
			Description string `json:"error_description"`
		}{}
		_ = json.Unmarshal(response.Body, &tokenError)
		ctx.Application().Logger().Errorf("%s: oauth token error: %s", agent, tokenError.Description)
		ctx.SetCookieKV("error", agent+": "+tokenError.Description, func(c *http.Cookie) {
			c.Path = "/login"
		})
		ctx.Redirect("/login")
		return false
	}
	_ = json.Unmarshal(response.Body, token)
	return true
}

func getUserInfo(agent, url string, params, header util.M, ctx iris.Context) ([]byte, bool) {
	status, response, err := util.UrlFetch.Get(url, params, header)
	if err != nil {
		handleResponseError(
			&util.ResponseT{status, response, err},
			agent+": user info url fetching failed: "+err.Error(),
			agent+": Could NOT fetch user information",
			agent+": user info response parsing failed: "+err.Error(),
			agent+": Could NOT parse user information",
			ctx,
		)
		return nil, false
	}
	return response, true
}

func parseUserInfo(rawData []byte, filter *map[string]string, modifiers ...func(*map[string]interface{})) []byte {
	jsonData, data := make(map[string]interface{}), make(map[string]interface{})
	_ = json.Unmarshal(rawData, &jsonData)
	for _, modifier := range modifiers {
		modifier(&jsonData)
	}
	for k, v := range *filter {
		data[v] = jsonData[k]
	}
	rawData, _ = json.Marshal(data)
	return rawData
}
