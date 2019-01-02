package logger

import (
	"github.com/kataras/golog"
	"os"
	"runtime"
	"strconv"
	"strings"
)

// COMPILE_TIME_GOPATH : global variable to store the GOPATH env variable during compilation time
var COMPILE_TIME_GOPATH string

// CallerInfoPlugin : plugin function to report file name and line number in log messages
func CallerInfoPlugin() func(*golog.Log) bool {

	if COMPILE_TIME_GOPATH == "" {
		COMPILE_TIME_GOPATH = os.Getenv("GOPATH")
	}

	pc := make([]uintptr, 1000)

	return func(l *golog.Log) bool {
		label := golog.GetTextForLevel(l.Level, false)
		if !strings.Contains(label, "[FATAL]") && !strings.Contains(label, "[ERROR]") && !strings.Contains(label, "[WARN]") {
			golog.SetOutput(os.Stdout)
			return false
		}

		n := runtime.Callers(2, pc)
		frames := runtime.CallersFrames(pc[:n])
		for {
			frame, more := frames.Next()
			if !more {
				break
			}
			frame.File = strings.Replace(frame.File, COMPILE_TIME_GOPATH+"/src/", "", 1)
			if strings.Contains(frame.File, "/vendor/") || string(frame.File[0]) == "/" {
				continue
			}
			l.Message +=
				"\n\t\t- " +
					"(" + (map[bool]string{true: "main.main", false: frame.Function})[strings.HasPrefix(frame.Function, "main.main")] + ") " +
					frame.File + ":" + strconv.Itoa(frame.Line)
		}
		golog.SetOutput(os.Stderr)
		return false
	}
}
