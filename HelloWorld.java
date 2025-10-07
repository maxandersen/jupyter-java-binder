//usr/bin/env jbang "$0" "$@" ; exit $?
//DEPS info.picocli:picocli:4.6.3

import picocli.CommandLine;
import picocli.CommandLine.Command;
import picocli.CommandLine.Parameters;

import java.util.concurrent.Callable;

@Command(name = "HelloWorld", mixinStandardHelpOptions = true, version = "HelloWorld 1.0",
        description = "HelloWorld made with jbang")
class HelloWorld implements Callable<Integer> {

    @Parameters(index = "0", description = "The greeting to print", defaultValue = "World!")
    private String greeting;

    public static void main(String... args) {
        int exitCode = new CommandLine(new HelloWorld()).execute(args);
        System.exit(exitCode);
    }

    @Override
    public Integer call() throws Exception {
        System.out.println("Hello " + greeting);
        return 0;
    }
}
