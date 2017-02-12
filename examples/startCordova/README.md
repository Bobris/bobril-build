# Sample of bobril in combination with Cordova

## Prerequisities
Working cordova and emulators.

## Initial commands

Run commands in project folder:

`cordova platform add browser android ios`

It can write some erros while installing browsersync plugin - don't care about them.

## Development

To build your applications and trigger rebuild with redeploy run followin command project/sources folder:

`bb`

Run commands in project folder (in second terminal):

`cordova run [platform] -- --live-reload`

Now you can work on your project e.g. in Visual Studio Code and your changes will be projected in the target device immediately.