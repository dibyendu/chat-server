package main

import (
	"app/configuration"
	"app/database"
	"app/handlers/login"
	file_line "app/logger"
	"app/test"
	"app/util"
	"app/util/auth"
	"app/util/mail"
	"context"
	"fmt"
	"github.com/kataras/golog"
	"github.com/kataras/iris"
	"github.com/kataras/iris/core/netutil"
	"github.com/kataras/iris/middleware/logger"
	"github.com/kataras/iris/middleware/recover"
	"github.com/kataras/iris/websocket"
	"net"
	"os"
	"time"
)

var (
	configurationFilePath  string = "../config/server.json"
	templateFilePath       string = "client/bundle"
	emailTemplateFilePath  string = "client/bundle/email_templates"
	staticTemplateFilePath string = "client/bundle/static_pages"
)

func main() {

	args, err := ArgParse(&configurationFilePath, &templateFilePath, &emailTemplateFilePath, &staticTemplateFilePath)
	if err != nil {
		fmt.Println(err.Error())
		os.Exit(1)
	}

	var hosts []net.Listener

	configuration, err := conf.Init(configurationFilePath)

	if err != nil {
		fmt.Println(err.Error())
		os.Exit(1)
	}

	for i := 0; i < len(configuration.Sockets); i++ {
		l, err := netutil.UNIX(configuration.Sockets[i], 0666)
		if err != nil {
			panic(err)
		}
		hosts = append(hosts, l)
	}

	golog.Levels[golog.FatalLevel].SetText("[FATAL]", "[FATAL]")
	golog.Levels[golog.ErrorLevel].SetText("[ERROR]", "[ERROR]")
	golog.Levels[golog.WarnLevel].SetText("[WARN]", "[WARN]")
	golog.Levels[golog.InfoLevel].SetText("[INFO]", "[INFO]")
	golog.Levels[golog.DebugLevel].SetText("[DEBUG]", "[DEBUG]")

	app := iris.New()

	app.Logger().SetLevel((map[bool]string{true: "warn", false: "debug"})[*args.isProdFlag])
	app.Logger().Handle(file_line.CallerInfoPlugin())

	/*
	 Optionally, add two built'n handlers
	 that can recover from any http-relative panics
	 and log the HTTP requests to the terminal
	*/
	app.Use(recover.New())
	app.Use(logger.New())

	db.Init()
	mail.Init()

	loggerTest.TestLogger()

	// Define templates using the "github.com/aymerick/raymond" handlebars template engine
	template := iris.Handlebars(templateFilePath, ".html")

	// Parse and load all files inside 'templateFilePath' folder with ".html" file extension
	if !*args.isProdFlag {
		app.RegisterView(template.Reload(true)) // Reload the templates on each request (development mode)
	} else {
		app.RegisterView(template)
	}
	app.RegisterView(iris.HTML(staticTemplateFilePath, ".htm"))

	// Register custom handler for specific http errors
	app.OnErrorCode(iris.StatusInternalServerError, func(ctx iris.Context) {
		ctx.View("500.htm")
	})

	app.OnErrorCode(iris.StatusNotFound, func(ctx iris.Context) {
		ctx.View("404.htm")
	})

	iris.RegisterOnInterrupt(func() {
		time.Sleep(500 * time.Millisecond)

		app.Logger().Infof(".... Terminating DB Session ....")
		db.Session.Close()

		app.Logger().Infof(".... Terminating Application ....")
		timeout := 5 * time.Second
		ctx, cancel := context.WithTimeout(context.Background(), timeout)
		defer cancel()
		app.Shutdown(ctx)
		time.Sleep(500 * time.Millisecond)
	})

	// create the websocket server
	// read the README from here for the complete API: https://github.com/kataras/go-websocket
	ws := websocket.New(websocket.Config{
		ReadBufferSize:  1024,
		WriteBufferSize: 1024,
	})
	ws.OnConnection(func(c websocket.Connection) {

		c.On("register user", func(data interface{}) {
			name, id := data.(map[string]interface{})["name"].(string), data.(map[string]interface{})["id"].(string)
			collection := db.Database.C("active_users")
			_, _ = collection.Upsert(db.M{"socket-id": c.ID()}, db.M{"$set": db.M{"user-name": name, "uuid": id}})
			var result []map[string]interface{}
			_ = collection.Find(nil).Select(db.M{"_id": 0}).All(&result)
			c.To(websocket.All).Emit("active users", result)
		})

		c.OnDisconnect(func() {
			channel := make(chan []util.M)

			go func(ch chan<- []util.M) {
				collection := db.Database.C("active_users")
				_, _ = collection.RemoveAll(db.M{"socket-id": c.ID()})
				var result []util.M
				_ = collection.Find(nil).Select(db.M{"_id": 0}).All(&result)
				ch <- result
			}(channel)

			result := <-channel
			c.To(websocket.Broadcast).Emit("active users", result)
		})

		c.On("chat message to server", func(data interface{}) {
			sender, sid, msg, receiver := data.(map[string]interface{})["sender"].(string), data.(map[string]interface{})["socket_id"].(string), data.(map[string]interface{})["message"].(string),
			data.(map[string]interface{})["receiver"].(string)
			go func() {
				c.To(sid).Emit("chat message from server", map[string]string{"from": sender, "message": msg})
			}()
			go func() {
				c.Emit("chat msg send ack", map[string]interface{}{"success": true, "message": msg, "to": receiver})
			}()
		})
	})

	// register the server on an endpoint.
	app.Get(configuration.Websocket, ws.Handler())

	app.Get("/chat", func(ctx iris.Context) {
		ctx.ViewData("iris", util.M{"version": iris.Version})
		ctx.ViewData("websocket", util.M{"endpoint": configuration.Websocket})
		ctx.View("chat.html")
	})

	app.Get("/protected", auth.Phase1, auth.Phase2, func(ctx iris.Context) {
		user := ctx.Values().Get("user").(util.SM)
		ctx.Writef("%s %s has successfully accessed protected resource", user["fname"], user["lname"])
		ctx.StatusCode(iris.StatusOK)
	})

	app = login.SetRoutes(app, template, emailTemplateFilePath)

	for i := 0; i < len(hosts); i++ {
		if i != len(hosts)-1 {
			time.Sleep(100 * time.Millisecond)

			// run in different goroutine in order to not block the main "goroutine"
			go app.Run(iris.Listener(hosts[i], func(su *iris.Supervisor) {
				su.RegisterOnShutdown(func() {
					app.Logger().Infof("Host[%s] ... terminated", su.Server.Addr)
				})
			}), iris.WithoutInterruptHandler)
		} else {
			time.Sleep(100 * time.Millisecond)
			app.Run(iris.Listener(hosts[i], func(su *iris.Supervisor) {
				su.RegisterOnShutdown(func() {
					app.Logger().Infof("Host[%s] ... terminated", su.Server.Addr)
				})
			}), iris.WithoutInterruptHandler)
		}
	}
}
