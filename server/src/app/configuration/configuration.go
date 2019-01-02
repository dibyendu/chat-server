package conf

import (
	"encoding/json"
	"io/ioutil"
)

// Configuration : global Configuration object structure
type Configuration struct {
	Sockets  []string `json:"go-nginx-domain-sockets"`
	Database struct {
		Port     string
		Name     string
		UserName string `json:"user"`
		Password string `json:"pass"`
	}
	CSRFToken string `json:"csrf-token"`
	JWTSecret string `json:"jwt-secret"`
	Websocket string `json:"websocket-endpoint"`
}

var conf Configuration

// Init : initialize the global Configuration object from main (1 time call)
func Init(filePath string) (*Configuration, error) {
	raw, err := ioutil.ReadFile(filePath)
	if err != nil {
		return nil, err
	}

	json.Unmarshal(raw, &conf)

	return &conf, nil
}

// Get : fetch the global Configuration object wherever required
func Get() *Configuration {
	return &conf
}
