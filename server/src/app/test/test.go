package loggerTest

import (
	file_line "app/logger"
	"github.com/kataras/golog"
)

// TestLogger : custom logger for testing purpose
func TestLogger() {
	golog.Error("1st ERROR message") // with file name and line number
	golog.Debug("1st DEBUG message")

	log := golog.New()
	log.SetLevel("debug")

	log.Handle(file_line.CallerInfoPlugin()) // if we omit this line, file name and line number are suppressed by default

	log.Error("2nd ERROR message")
	log.Debug("2nd DEBUG message")
}
