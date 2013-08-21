function main()
{
	$.ajaxSetup ({ cache: false });

	var result = $(document.createElement("div"));
	result.load("modules.html?" + Date.now(), function() { parse_index(result); });
}

function parse_index(root)
{
	var categories = [];

	var elem = root.find("#row_0_");

	while (elem.length > 0)
	{
		categories.push({
			name: elem.find("a.el").text(),
			link: elem.find("a.el").attr("href"),
			desc: elem.find(".desc").text()
		});

		elem = root.find("#row_" + categories.length + "_");
	}

	for (var i = 0; i < categories.length; i++)
	{
		var modules = [];

		elem = root.find("#row_" + i + "_0_");

		while (elem.length > 0)
		{
			modules.push({
				name: elem.find("a.el").eq(0).text(),
				link: elem.find("a.el").eq(0).attr("href"),
				desc: elem.find(".desc").text()
			});

			elem = root.find("#row_" + i + "_" + modules.length + "_");
		}

		categories[i].modules = modules;
	}

	var N = 0;

	for (var i = 0; i < categories.length; i++)
		N += categories[i].modules.length;

	function done()
	{
		generate_index(categories);
	}

	function load(module)
	{
		var result = $(document.createElement("div"));

		result.load(module.link + "?" + Date.now(), function() {
			var info = parse_functions(result);

			module.functions = info.functions;
			module.header = info.header;

			if (--N === 0)
				done();
		});
	}

	for (var i = 0; i < categories.length; i++)
	{
		for (var j = 0; j < categories[i].modules.length; j++)
			load(categories[i].modules[j]);
	}
}

function parse_functions(root)
{
	var functions = [];

	var title = root.find(".memberdecls a[name='func-members']");

	if (title.length === 0)
		return { functions: functions, header: "" };

	title.closest(".memberdecls").find(".memTemplItemLeft, .memItemLeft").parent().each(function() {
		var deprecated = false;

		var ret = $(this).find(".memTemplItemLeft, .memItemLeft").text();
		ret = ret.replace("GLM_FUNC_QUALIFIER", "");
		ret = ret.replace("GLM_FUNC_DECL", "");
		ret = ret.replace(/< ([^>]+) >/g, "<$1>");
		ret = ret.replace(/ \*/g, "*");
		ret = ret.replace(/ &/g, "&");
		ret = ret.replace(/typename /g, "");
		ret = ret.replace(/\n/g, "");
		ret = ret.replace(/detail::/g, "");

		if (ret.indexOf("GLM_DEPRECATED") !== -1)
		{
			deprecated = true;
			ret = ret.replace("GLM_DEPRECATED", "");
		}

		ret = $.trim(ret);

		var name = $(this).find("a.el");

		if (name.length === 0)
			name = $(this).find("b");

		name = name.eq(0).text().replace("glm::", "");

		var link = $(this).find("a.el").eq(0).attr("href");

		var params = $(this).find(".memTemplItemRight, .memItemRight").clone();
		params[0].removeChild(params[0].childNodes[0]);
		params = params.text();
		params = params.replace(/< ([^>]+) >/g, "<$1>");
		params = params.replace(/typename /g, "");
		params = params.replace(/detail::/g, "");
		params = $.trim(params);

		functions.push({
			returnType: ret,
			funcName: name,
			link: link,
			params: params,
			deprecated: deprecated
		});
	});

	var paragraphs = $();

	var detailsHeader = root.find(".groupheader").filter(function() {
		return $(this).text().indexOf("Detailed") !== -1;
	});

	var elem = detailsHeader.next();

	while (elem.length > 0 && elem[0].tagName !== "H2")
	{
		if (elem[0].tagName === "P")
			paragraphs = paragraphs.add(elem);

		elem = elem.next();
	}

	var header = paragraphs.text().match(/<.+\.hpp>/g) || ["<glm/glm.hpp>"];

	return { functions: functions, header: header[0] };
}

function generate_index(categories)
{
	var elements = [];

	elements.push($("<h1>").text("GLM Function Reference"));

	for (var i = 0; i < categories.length; i++)
	{
		var cat = categories[i];

		elements.push($("<h2>").text(cat.name));

		var count = 0;

		for (var j = 0; j < cat.modules.length; j++)
		{
			var mod = cat.modules[j];

			if (mod.functions.length === 0)
				continue;

			var table = $("<table>");
			var tableHeader = $("<thead>");
			var tableBody = $("<tbody>");

			var tr = $("<tr>");
			var td = $("<th>");

			td.attr("colspan", "2");
			td.attr("align", "left");
			td.text(mod.name);
			td.append("<br>", $("<span>").text(mod.header).addClass("hpp"));

			tr.append(td);
			tableHeader.append(tr);
			table.append(tableHeader);
			table.append(tableBody);

			for (var k = 0; k < mod.functions.length; k++)
			{
				var f = mod.functions[k];

				var tr = $("<tr>");
				var td = $("<td>");
				var td2 = $("<td>");

				td.attr("width", "1");
				td.attr("valign", "top");
				td2.attr("valign", "top");

				var ret = $("<span>").text(f.returnType);
				ret.html(ret.html().replace(/\b(const)\b/g, '<span class="keyword">$1</span>'));

				td.append(ret, "&nbsp;");

				if (f.link)
					td2.append($("<a>").text(f.funcName).attr("href", "html/" + f.link));
				else
					td2.append($("<span>").text(f.funcName).addClass("nolink"));

				var params = $("<span>").text(f.params);
				params.html(params.html().replace(/\b(const)\b/g, '<span class="keyword">$1</span>'));

				td2.append(params);

				if (f.deprecated)
					td2.append($("<span>").text(" [deprecated]").addClass("deprecated"));

				tr.append(td, td2);
				tableBody.append(tr);
			}

			elements.push(table);

			count++;
		}

		if (count === 0)
			elements.pop();
	}


	$.get("../template.html?" + Date.now(), function(data) {
		var content = "";

		for (var i = 0; i < elements.length; i++)
			content += elements[i][0].outerHTML;

		var result = data.replace("${CONTENT}", content);
		var href = "data:text/html;charset=utf-8," + encodeURIComponent(result);

		$("<iframe>").attr("src", href).appendTo("body");
	}, "html");
}
