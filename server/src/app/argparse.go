package main

import (
	"flag"
	"os"
	"path/filepath"
)

type commandLineArgs struct {
	isProdFlag *bool
	basePath   *string
}

// ArgParse : command line arguments parser for the application executable
func ArgParse(confPath, tmplPath, emailTmplPath, staticTmplPath *string) (*commandLineArgs, error) {
	var args commandLineArgs
	args.isProdFlag = flag.Bool("production", false, "use this flag to run the production executable")
	args.basePath = flag.String("base", "", "base path (that contains client and server files) of the web application")
	flag.Parse()
	if *args.isProdFlag {
		*confPath = filepath.Join(*args.basePath, *confPath)
		*tmplPath = filepath.Join(*args.basePath, *tmplPath)
		*emailTmplPath = filepath.Join(*args.basePath, *emailTmplPath)
		*staticTmplPath = filepath.Join(*args.basePath, *staticTmplPath)
	} else {
		basePath, err := filepath.Abs(filepath.Dir(os.Args[0]))
		if err != nil {
			return &args, err
		}
		var (
			intermediateTmplPath       string
			intermediateEmailTmplPath  string
			intermediateStaticTmplPath string
			intermediateConfPath       string
		)
		for {
			intermediateTmplPath = filepath.Join(basePath, *tmplPath)
			intermediateEmailTmplPath = filepath.Join(basePath, *emailTmplPath)
			intermediateStaticTmplPath = filepath.Join(basePath, *staticTmplPath)
			intermediateConfPath = filepath.Join(basePath, *confPath)
			if _, err = os.Stat(intermediateConfPath); err == nil {
				*tmplPath, *emailTmplPath, *staticTmplPath, *confPath = intermediateTmplPath, intermediateEmailTmplPath, intermediateStaticTmplPath, intermediateConfPath
				break
			}
			basePath = filepath.Dir(basePath)
		}
	}
	return &args, nil
}
