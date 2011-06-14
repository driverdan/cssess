/**
 * CSSess
 * A bookmarklet for detecting unused CSS selectors and related info.
 * Copyright 2010 passive.ly LLC
 * @see http://github.com/driverdan/cssess
 *
 * @author Dan DeFelippi <dan@driverdan.com>
 * @license MIT license, see LICENSE
 */

var cssess = cssess || {};

cssess.baseUrl = "http://driverdan.github.com/cssess/";
// CHANGE TO RELATIVE PATH FOR TESTING
// At some point this will be changed to switch via URL parameter
//cssess.baseUrl = "../";

// Get site's base URL for checking remote scripts
cssess.siteUrl = window.location.protocol + "//" + window.location.hostname;

// Data format version. Used for Jdrop.
cssess.dataVersion = "1.0.0";

// Save result data. Used for views & Jdrop.
cssess.data = {};

// Namespace for all templates / views
cssess.v = {};

// List of links on the page
cssess.links = [];

/**
 * Fetches the styles from a page and checks them.
 */
cssess.checkStyles = function(url, source) {
	var style = [];
	
	// Default source is the document
	source = source || document;
	
	// Process inline styles
	cssess.$("style", source).each(function() {
		style = style.concat(cssess.parseCss(this.innerHTML, source));
	});
	
	if (style.length) {
		cssess.addUnused("inline styles (" + url + ")", style);
	}
	
	// Process stylesheets
	cssess.$("link[rel='stylesheet'][href!='']:not([href^='file:']):not([href^='chrome://'])", source).each(function() {
		// Check for local or external stylesheet
		var href = this.href;
		
		if (!href.match(/^https?:\/\//) 
			|| href.indexOf(cssess.siteUrl) == 0 
		) {
			cssess.$.get(href, function(data, status) {
				if (data) {
					var selectors = cssess.parseCss(data, source);
					if (selectors.length) {
						cssess.addUnused(href, selectors);
					}
				}
			});
		}
	});
};

/**
 * Loads page links and builds list for spidering.
 */
cssess.start = function() {
	// Start with the current page
	cssess.v.addLink(window.location.href);
	
	/**
	 * Find valid anchor elements. Exclude
	 * Empty hrefs
	 * JavaScript
	 * Hashes
	 * Emails
	 * Local files
	 * Chrome extensions
	 */
	cssess.$("a[href!='']:not([href^='javascript:']):not([href^='#']):not([href^='mailto:']):not([href^='file:']):not([href^='chrome://'])").each(function() {
		var href = this.href;
		
		// Check for external links
		if (!href.match(/^https?:\/\//) 
			|| (
				href.indexOf(cssess.siteUrl) == 0 
				&& href != window.location
			)
		) {
			// Add link to view
			cssess.v.addLink(this.href);
		}
	});
};

/**
 * Parses CSS string and checks for unused selectors.
 *
 * @param string CSS to parse.
 * @param object Optional DOM object to check selectors against. Default is document.
 * @return array Returns array of unused selectors.
 */
cssess.parseCss = function(data, source) {
	// regexes from Helium: https://github.com/geuis/helium-css/
	data = data
		// Remove comments
		.replace(/\/\*[\s\S]*?\*\//gim, "")
		// Remove whitespace
		.replace(/[\n\t]/g, "");
	
	var selectors = data.match(/[^\}]+[\.\#\-\w]?(?=\{)/gim)
		, missing = []
		, i;
	
	for (i in selectors) {
		// Wrap in try/catch for invalid selectors
		try {
			if (!cssess.$(selectors[i], source).length) {
				missing.push(selectors[i]);
			}
		} catch (e) {}
	}
	
	return missing;
};

/**
 * Spiders all same domain links within the page.
 */
cssess.spider = function() {
	if (this.urls && this.urls.length) {
		var $iframe = cssess.$("#cssesspider")
			, src = this.urls.pop();
		
		// Create iframe if it doesn't exist
		if (!$iframe.length) {
			$iframe = cssess.$('<iframe id="cssesspider" style="display:none"/>');
			
			$iframe.load(function() {
				// Run on the new document
				// try / catch in case of cross domain issues
				try {
					cssess.checkStyles(this.src, cssess.$(this).contents());
				} catch (e) {}
				
				// Continue spidering
				cssess.spider();
			});
			$iframe.appendTo(cssess.win);
		}
		
		// Check if it's the local page
		if (src == window.location.href) {
			cssess.checkStyles(src);
		} else {
			$iframe.attr("src", src);
		}
	} else {
		cssess.$("#cssesspider").remove();
	}
};

/**
 * Loads all checked links to be spidered.
 */
cssess.loadLinks = function() {
	cssess.urls = [];
	
	cssess.$("input[name='urls']:checked", cssess.win).each(function() {
		cssess.urls.push(this.value);
	});
};

/**
 * Add unused styles to data array and to view.
 */
cssess.addUnused = function(name, selectors) {
	cssess.data[name] = selectors;
	
	cssess.v.addUnused(name, selectors);
};

/**
 * Save data to Jdrop
 */
cssess.saveToJdrop = function(summary) {
	// create object of parameters to pass to Jdrop
	var params = {
		appname: "CSSess"
		,title: document.title
		,version: cssess.dataVersion
		,summary: summary
		,json: JSON.stringify(cssess.data)
	};

	// hidden iframe to use as target of form submit
	var jdropif = document.createElement("iframe");
	jdropif.style.display = "none";
	jdropif.name = "jdropiframe";
	jdropif.id = "jdropiframe";
	document.body.appendChild(jdropif);

	// form for posting data
	var jdropform = document.createElement("form");
	jdropform.method = "post";
	jdropform.action = "http://jdrop.org/save";
	jdropform.target = "jdropiframe";
	jdropform.style.display = "hidden";

	// add each param to the form as an input field
	for (var key in params) {
		var pInput = document.createElement("input");
		pInput.setAttribute("name", key);
		pInput.setAttribute("value", params[key]);
		jdropform.appendChild(pInput);
	}

	// submit the form and cleanup
	document.body.appendChild(jdropform);
	jdropif.onload = function() { document.body.removeChild(jdropform); document.body.removeChild(jdropif); };
	jdropif.onerror = function() { document.body.removeChild(jdropform); document.body.removeChild(jdropif); };
	jdropform.submit();
};

/**
 * Creates the modal window.
 */
cssess.v.createWin = function() {
	// Remove window if it already exists
	if (cssess.win) {
		cssess.win.remove();
	}
	cssess.$("#cssess").remove();
	cssess.win = cssess.$('<div id="cssess-overlay"/><div id="cssess"><h2>CSSess</h2><a class="cssess-close" title="close" href="">X</a><div class="cssess-body"><button class="cssess-toggle">Toggle</button><button class="cssess-jdrop">Save to Jdrop</button><ul class="cssess-links"/><ul class="cssess-styles"/></div><button class="cssess-run">find unused selectors</button></div>');
	
	// Add event to run button to run tests
	cssess.$(".cssess-run", cssess.win).click(function() {
		// Clear any previously detected styles
		cssess.$(".cssess-styles", cssess.win).html("");
		
		// Load the checked links and spyder them.
		cssess.loadLinks();
		cssess.spider();
		cssess.$(".cssess-jdrop").show();
	});
	
	// Close button removes the win div
	cssess.$(".cssess-close", cssess.win).click(function() {
		cssess.win.remove();
		return false;
	});
	
	// Button to toggle checkboxes
	cssess.$(".cssess-toggle", cssess.win).click(function() {
		cssess.$(":checkbox", cssess.win).each(function() {
			this.checked ? this.checked = false : this.checked = "checked";
		});
	});
	
	// Button to save to Jdrop
	// @see http://jdrop.org
	cssess.$(".cssess-jdrop", cssess.win).click(function() {
		// Get a total count of unused selectors
		var count = 0;
		
		for (i in cssess.data) {
			count += cssess.data[i].length;
		}
		
		// Save it
		cssess.saveToJdrop(count + " unused CSS selectors");
	});
	
	cssess.win.appendTo("body");
};

/**
 * Adds a newly found link to the DOM
 */
cssess.v.addLink = function(href) {
	// Make sure the link hasn't already been found
	if (cssess.$.inArray(href, cssess.links) == -1) {
		cssess.links.push(href);
		cssess.$(".cssess-links", cssess.win).append('<li><input type="checkbox" name="urls" value="' + href + '" checked/> ' + href + '</li>');
	}
};

/**
 * Save additional unused selectors
 */
cssess.v.addUnused = function(name, selectors) {
	var data = {}
		,i;
	
	if (name && selectors) {
		data[name] = selectors;
	} else {
		data = name;
	}
	
	for (i in data) {
		name = i;
		selectors = data[i];
		
		var $ul = cssess.$(".cssess-styles", cssess.win)
			, li = "<li><strong>" + name + " (" + selectors.length + " found)</strong><ul>"
			, i;
		// Each missing selector
		for (i in selectors) {
			li += "<li>" + selectors[i] + "</li>";
		}
		$ul.append(li + "</ul></li>");
	}
};

// Initialize everything
(function(d, t) {
	var el, s
	
	/**
	 * Opens the dialog and gets it running.
	 */
	, init = function($) {
		// Create modal window
		cssess.v.createWin();

		// Don't run start if it's loading Jdrop data
		if (!JDROPVIEW) {
			cssess.start();
		}
	};
	
	// Get the stylesheet
	el = d.createElement("link");
	el.rel = "stylesheet";
	el.href = cssess.baseUrl + "cssess.css";
	s = d.getElementsByTagName(t)[0];
	s.parentNode.insertBefore(el, s);
	
	// Load jQuery
	// Intentionally loads even if already on page to avoid version incompatibilities
	el = d.createElement(t);
	el.src = "//ajax.googleapis.com/ajax/libs/jquery/1.4.4/jquery.min.js";
	el.onload = function() {
		el.loaded = true;
		cssess.$ = jQuery.noConflict(true);
		init(cssess.$);
	};
	el.onreadystatechange = function() {
		if ((el.readyState == "loaded" || el.readyState == "complete") && !el.loaded) {
			el.loaded = true; 
			cssess.$ = jQuery.noConflict(true);
			init(cssess.$);
		}
	};
	s.parentNode.insertBefore(el, s);
})(document, "script");
