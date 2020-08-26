EXTENSION	:= "simple-websocket-client"
EXTVERSION	:= $(shell grep '"version":' manifest.json | awk '{print $$2}' | tr -d '",')

dist: clean
	$(eval FNAME := "$(EXTENSION)-$(EXTVERSION).zip")
	@echo "make $(FNAME)..."
	@zip -r "$(FNAME)" . -x@configs/exclude.lst

test:
	@echo "run test_js..."
	@npm run test_js -s
	@echo "run test_css..."
	@npm run test_css -s

clean:
	@echo "remove old zip-files..."
	@rm -f *.zip
