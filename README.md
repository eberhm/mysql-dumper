Mysql-dumper
============

[![Build Status](https://travis-ci.org/eberhm/mysql-dumper.svg?branch=master)](https://travis-ci.org/eberhm/mysql-dumper)

With this little tool you can automate a smartish db minidump using a [config file](config.example.json). See doc for definition of the config file.

#Running it

```$ bin/mysql-dumper [OPTIONS] </path/to/dump/files> ```

#Options

-c config file to use. Use always full path...for now ;)

-d dry run. Only shows the mysqldump command to execute

-b block to execute, dumps only a single block
