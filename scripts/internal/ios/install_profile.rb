#!/usr/bin/ruby

require 'fileutils'
def getProfilepath
    path = File.expand_path("~") + "/Library/MobileDevice/Provisioning Profiles/"
    unless File.directory?(path)
      FileUtils.mkdir_p(path)
    end

    return path
  end


destination = File.join(getProfilepath, ARGV[0])

FileUtils.copy(ARGV[1], destination) unless File.exist?(destination)
sleep(0.5);
exit(true)


        