EXTENSION	:= "simple-websocket-client"
EXTVERSION	:= $(shell grep '"version":' manifest.json | awk '{print $$2}' | tr -d '",')

dist:
	@rm -f *.zip
	zip -r "$(EXTENSION)-$(EXTVERSION).zip" . -x@exclude.lst

test:
	@npm run test_js -s
	@npm run test_css -s
