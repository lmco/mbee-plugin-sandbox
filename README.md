## Sandbox Plugin

The Sandbox Plugin is designed to allow every user to have their own sandbox so
that they can experiment with MBEE however they choose, without affecting other
organizations or projects. When a user is created, a sandbox organization is
created for that specific user and they can do whatever they desire with it.
If and when that user is deleted, their sandbox organization (and any projects
and elements in the organization) is deleted.

#### Installation

Installation of the sandbox plugin is very simple. To install the plugin,
simply include the following bit of code in your running MBEE config in the
`server.plugins` section:

```json
{
  "plugins": {
    "enabled": true,
    "plugins": [{
      "name": "sandbox",
      "source": "https://github.com/lmco/mbee-plugin-sandbox.git",
      "title": "Sandbox"
    }],
    "sandbox": {
      "retroactive": true
    }
  }
 
}
```

NOTE: Ensure "enabled" is set to true so that plugins are installed and built
upon restart of the server.

#### Running the Plugin

To run the plugin, simply restart the running instance of MBEE. The plugin code
will be copied, built and will start along with the server.

Nothing needs to be done to manage the plugin. When a user is created in the
system, a sandbox organization is created along with them. That user becomes an
admin of that organization, and can edit that org and add projects and users. 

If/When the user is deleted, the organization is automatically deleted, along
with any projects stored in the org, and any elements in those projects.

#### Configuration Options

To change the default configuration options, visit the running MBEE config, and
go to the `server.plugins.sandbox` section. If this section does not exist, feel
free to add it.

Below are the supported config options, and a description of what they do.

* retroactive (boolean)
    * If true, creates sandbox orgs for all existing users if they do not
    currently have one upon startup of the server.
    
    
#### Public Release Info
This code is part of the MBEE source code, and is thus approved for public 
release per PIRA #SSS201809050.
