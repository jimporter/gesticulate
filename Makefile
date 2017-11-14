ADDON_NAME=gesticulate
ADDON_VERSION=0.3a5

.PHONY: clean
clean:
	git clean -fX .

.PHONY: package
package: clean
	rm -f $(ADDON_NAME)-$(ADDON_VERSION).xpi
	cd src && zip -r ../$(ADDON_NAME)-$(ADDON_VERSION).xpi *
