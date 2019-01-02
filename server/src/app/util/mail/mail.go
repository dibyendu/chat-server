package mail

import (
	"github.com/kataras/golog"
	"github.com/sendgrid/sendgrid-go"
	"github.com/sendgrid/sendgrid-go/helpers/mail"
	"gopkg.in/yaml.v2"
	"io/ioutil"
	"os"
)

var (
	secretFilePath = "app/util/mail/sendgrid-token.yaml"
	secret         = struct{ Sendgrid struct{ Token string } }{}
)

var mailClient *sendgrid.Client

// Init : initialize the global Mail client from main (1 time call)
func Init() {
	gopath := os.Getenv("GOPATH")

	raw, err := ioutil.ReadFile(gopath + "/src/" + secretFilePath)
	if err != nil {
		golog.Errorf("Error reading the sendgrid api token file: %s", err)
	}

	if err := yaml.Unmarshal(raw, &secret); err != nil {
		golog.Errorf("Error unmarshalling the sendgrid api token file: %s", err)
	}

	mailClient = sendgrid.NewSendClient(secret.Sendgrid.Token)
}

// Send : send mail using this function whenever necessarily
func Send(receiverFname, receiverLname, receiverEmail, subject, textBody, htmlBody string) {
	from := mail.NewEmail("Example User", "test@example.com")
	to := mail.NewEmail(receiverFname+" "+receiverLname, receiverEmail)
	message := mail.NewSingleEmail(from, subject, to, textBody, htmlBody)
	_, err := mailClient.Send(message)
	if err != nil {
		golog.Errorf("Error in sending mail: %s", err)
	}
}

// package mail
//
// import (
// 	"bytes"
// 	"fmt"
// 	"github.com/kataras/golog"
// 	"gopkg.in/yaml.v2"
// 	"html/template"
// 	"io/ioutil"
// 	"net/smtp"
// 	"os"
// )
//
// var (
// 	secretFilePath = "app/util/mail/email-credentials.yaml"
// 	secret           = struct {
// 		Email struct {
// 			Server   string
// 			Port     int
// 			User     string
// 			Email    string
// 			Password string
// 		}
// 	}{}
// )
//
// type Request struct {
// 	from    string
// 	to      []string
// 	subject string
// 	body    string
// }
//
// const (
// 	MIME = "MIME-version: 1.0;\nContent-Type: text/html; charset=\"UTF-8\";\n\n"
// )
//
// // Init : initialize the global Mail client from main (1 time call)
// func Init() {
// 	gopath := os.Getenv("GOPATH")
//
// 	raw, err := ioutil.ReadFile(gopath + "/src/" + secretFilePath)
// 	if err != nil {
// 		golog.Errorf("Error reading the email credentials file: %s", err)
// 	}
//
// 	if err := yaml.Unmarshal(raw, &secret); err != nil {
// 		golog.Errorf("Error unmarshalling the email credentials file: %s", err)
// 	}
// }
//
// // Send : send mail using this function whenever necessarily
// func Send(receiverFname, receiverLname, receiverEmail, subject, textBody, htmlBody string) {
// 	r := &Request{
// 		from:    secret.Email.Email,
// 		to:      []string{receiverEmail},
// 		subject: subject,
// 	}
//
// 	t := template.New("email template")
// 	t, err := t.Parse(htmlBody)
// 	if err != nil {
// 		golog.Errorf("Error parsing the email template: %s", err)
// 	}
// 	buffer := new(bytes.Buffer)
// 	if err = t.Execute(buffer, map[string]string{"username": "Conor"}); err != nil {
// 		golog.Errorf("Error executing the email template: %s", err)
// 	}
// 	r.body = buffer.String()
//
// 	body := "To: " + r.to[0] + "\r\nSubject: " + r.subject + "\r\n" + MIME + "\r\n" + r.body
// 	SMTP := fmt.Sprintf("%s:%d", secret.Email.Server, secret.Email.Port)
//
// 	if err := smtp.SendMail(SMTP, smtp.PlainAuth("", secret.Email.User, secret.Email.Password, secret.Email.Server), r.from, r.to, []byte(body)); err != nil {
// 		golog.Errorf("Failed to send the email to %s, Error: %v\n", r.to, err)
// 	} else {
// 		golog.Infof("Email has been sent to %s\n", r.to)
// 	}
// }
