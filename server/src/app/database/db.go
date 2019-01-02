package db

import (
	"app/configuration"
	"bytes"
	"github.com/globalsign/mgo"
	"github.com/globalsign/mgo/bson"
	"github.com/kataras/golog"
	"text/template"
)

var (
	// Database : global Database object
	Database *mgo.Database
	// Session : global Session object
	Session *mgo.Session
)

// M : generic {<string>: <any-type>} map
type M bson.M

// Init : initialize the database connection from main
func Init() {
	var mongoURL bytes.Buffer
	var err error
	configuration := conf.Get()
	template.Must(template.New("mongo_url").Parse(`mongodb://{{.UserName}}:{{.Password}}@localhost:{{.Port}}`)).Execute(&mongoURL, configuration.Database)
	Session, err = mgo.Dial(mongoURL.String())
	if err != nil {
		golog.Errorf("Database connection error: %s", err.Error())
	}
	Database = Session.DB(configuration.Database.Name)
}
