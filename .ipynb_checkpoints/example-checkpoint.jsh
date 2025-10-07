#!/usr/bin/env jbang

//DEPS org.apache.commons:commons-lang3:3.12.0

import static java.lang.System.*;

import org.apache.commons.lang3.StringUtils;

String name = "JBang";
if (args.length > 0) {
    name = args[0];
}

out.println("Hello " + StringUtils.capitalize(name) + "!");
out.println("This is a .jsh script running with jbang!");
