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

cssess.baseUrl = "https://github.com/driverdan/cssess/raw/master/";
// CHANGE TO RELATIVE PATH FOR TESTING
// At some point this will be changed to switch via URL parameter
//cssess.baseUrl = "../";

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
		cssess.v.addUnused("inline styles (" + url + ")", style);
	}
	
	// Process stylesheets
	cssess.$("link[rel='stylesheet']", source).each(function() {
		// Check for local or external stylesheet
		var href = this.href;
		//if (href.indexOf(window.location.hostname)) {
			cssess.$.get(href, function(data, status) {
				if (data) {
					var selectors = cssess.parseCss(data, source);
					if (selectors.length) {
						cssess.v.addUnused(href, selectors);
					}
				}
			});
		//}
	});
};

/**
 * Loads page links and builds list for spidering.
 */
cssess.start = function() {
	// Start with the current page
	cssess.v.addLink(window.location.href);
	
	// Get anchors that don't have an empty href, JS, or internal link
	cssess.$("a[href!='']:not([href^='javascript:']):not([href^='#']):not([href^='mailto:'])").each(function() {
		var href = this.href;
		
		// Check for external links
		if (!href.match(/^https?:\/\//) 
			|| (
				href.indexOf(window.location.protocol + "//" + window.location.hostname) == 0 
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
				} catch (e) {
					console.log(e);
				}
				
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
		cssess.$("cssesspider").remove();
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
 * Creates the modal window.
 */
cssess.v.createWin = function() {
	// Remove window if it already exists
	if (cssess.win) {
		cssess.win.remove();
	}
	cssess.$("#cssess").remove();
	cssess.win = cssess.$('<div id="cssess-overlay"/><div id="cssess"><h2>CSSess</h2><a class="cssess-close" title="close" href="">X</a><div class="cssess-body"><ul class="cssess-links"/><ul class="cssess-styles"/></div><button class="cssess-run">find unused selectors</button></div>');
	
	// Add event to run button to run tests
	cssess.$("button.cssess-run", cssess.win).click(function() {
		// Clear any previously detected styles
		cssess.$("ul.cssess-styles", cssess.win).html("");
		
		// Load the checked links and spyder them.
		cssess.loadLinks();
		cssess.spider();
	});
	
	// Close button removes the win div
	cssess.$("a.cssess-close", cssess.win).click(function() {
		cssess.win.remove();
		return false;
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
		cssess.$("ul.cssess-links", cssess.win).append('<li><input type="checkbox" name="urls" value="' + href + '" checked/> ' + href + '</li>');
	}
};

/**
 * Save additional unused selectors
 */
cssess.v.addUnused = function(name, selectors) {
	var $ul = cssess.$("ul.cssess-styles", cssess.win)
		, li = "<li><strong>" + name + " (" + selectors.length + " found)</strong><ul>"
		, i;
	// Each missing selector
	for (i in selectors) {
		li += "<li>" + selectors[i] + "</li>";
	}
	$ul.append(li + "</ul></li>");
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
		cssess.start();
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
	el.src = "http://ajax.googleapis.com/ajax/libs/jquery/1.4.4/jquery.min.js";
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
