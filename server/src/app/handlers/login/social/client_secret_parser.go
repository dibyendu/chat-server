package social

// Auth : authorization structure (sub structure of the ClientSecret structure)
type Auth struct {
	Url         string `yaml:"auth_url"`
	Separator   string `yaml:"scope_separator"`
	QueryParams struct {
		RedirectURI  string
		ResponseType string
		ClientID     string
		Scope        []string
		AccessType   string
		AuthType     string
	}
}

// ClientSecret : the ClientSecret structure
// Note: struct fields must be public in order for unmarshal to correctly populate the fields
type ClientSecret struct {
	Google struct {
		Auth
		Token struct {
			Url          string `yaml:"token_url"`
			ClientSecret string
		}
		Api struct {
			UserURL   string `yaml:"user_info_url"`
			Geocoding string
			Timezone  string
			Key       string // for timezone api & geocoding api
			ReCAPTCHA struct {
				Url       string `yaml:"verify_url"`
				ClientKey string `yaml:"site_key"`
				ServerKey string `yaml:"secret_key"`
			} `yaml:"reCAPTCHA"`
		}
	}

	Facebook struct {
		Auth
		Token struct {
			Url          string `yaml:"token_url"`
			ClientSecret string
		}
		Api struct {
			Permission struct {
				Url string
			}
			Info struct {
				Url    string
				Fields []string
			}
			Picture struct {
				Url   string
				Query struct {
					Redirect bool
					Width    string
					Height   string
				}
			}
		}
	}

	Github struct {
		Auth
		Token struct {
			Url          string `yaml:"token_url"`
			ClientSecret string
		}
		Api struct {
			Url   string `yaml:"user_info_url"`
			Email string `yaml:"user_email_url"`
		}
	}

	Yahoo struct {
		Auth
		Token struct {
			Url          string `yaml:"token_url"`
			ClientSecret string
		}
		Api struct {
			UserURL string `yaml:"user_info_url"`
		}
	}

	Microsoft struct {
		Auth
		Token struct {
			Url          string `yaml:"token_url"`
			ClientSecret string
		}
		Api struct {
			UserInfo struct {
				Url string
			}
			Picture struct {
				MetaURL string
				Url     string
			}
		}
	}
}
