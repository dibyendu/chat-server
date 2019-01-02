package util

import (
	"io/ioutil"
	"net/http"
	neturl "net/url"
	"strconv"
	"strings"
	"time"
)

// ResponseT : structure of response object obtained from url fetch
type ResponseT struct {
	Status int
	Body   []byte
	Error  error
}

var client = http.Client{
	Timeout: time.Second * 10, // Maximum of 10 secs
}

// UrlFetchT : types of functions associated with url fetch
type UrlFetchT struct {
	Get  func(string, M, M) (int, []byte, error)
	Post func(string, M, M) (int, []byte, error)
}

func toString(value interface{}) string {
	switch value.(type) {
	case string:
		return value.(string)
	case int:
		return strconv.Itoa(value.(int))
	case bool:
		return strconv.FormatBool(value.(bool))
	case float32, float64:
		return strconv.FormatFloat(value.(float64), 'g', -1, 64)
	default:
		return ""
	}
}

// UrlFetch : global UrlFetch object for fetching URLs from the server side
var UrlFetch = UrlFetchT{
	Get: func(url string, query_params, header M) (int, []byte, error) {
		baseURL, _ := neturl.ParseRequestURI(url)
		if query_params != nil {
			query := neturl.Values{}
			for k, v := range query_params {
				query.Add(k, toString(v))
			}
			baseURL.RawQuery = query.Encode()
		}

		request, _ := http.NewRequest("GET", baseURL.String(), nil)
		request.Header.Set("Accept", "application/json")
		if header != nil {
			for k, v := range header {
				request.Header.Set(k, toString(v))
			}
		}
		response, err := client.Do(request)
		if err != nil {
			return -1, []byte{}, err
		}
		defer response.Body.Close()
		responseBody, err := ioutil.ReadAll(response.Body)
		if err != nil {
			return response.StatusCode, []byte{}, err
		}
		return response.StatusCode, responseBody, nil
	},
	Post: func(url string, body, header M) (int, []byte, error) {
		payload := neturl.Values{}
		if body != nil {
			for k, v := range body {
				payload.Set(k, toString(v))
			}
		}
		request, _ := http.NewRequest("POST", url, strings.NewReader(payload.Encode()))
		request.Header.Set("Content-Type", "application/json")
		if header != nil {
			for k, v := range header {
				request.Header.Set(k, toString(v))
			}
		}
		response, err := client.Do(request)
		if err != nil {
			return -1, []byte{}, err
		}
		defer response.Body.Close()
		responseBody, err := ioutil.ReadAll(response.Body)
		if err != nil {
			return response.StatusCode, []byte{}, err
		}
		return response.StatusCode, responseBody, nil
	},
}
