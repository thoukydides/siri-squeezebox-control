# Squeezebox Control

This is a script for Simon Støvring's [Scriptable](https://scriptable.app/) app that provides voice control of Squeezebox players connected to a [Logitech Media Server](http://downloads-origin.slimdevices.com/). It can be used from Siri on an iPhone, iPad, or HomePod.

## Minimum Requirements

The following are required:
* Logitech Media Server, version 7.6 or later.
* iPhone or iPad, running iOS/iPadOS version 13.1 or later.
* Scriptable app, version 1.4 or later.

## Installation

1. Install the script in Scriptable:
   1. Launch Scriptable and click on the plus symbol in the top-right to create a new script.
   1. Download the [`Squeezebox Control.js`](https://raw.githubusercontent.com/thoukydides/siri-squeezebox-control/master/Squeezebox%20Control.js) file from this repository and paste it into the blank Scriptable script.
   1. Near the start of the script modify the `lmsHostname` (and if necessary `lmsPort`) constants appropriately for the Logitech Media Server's web server. If the server's **Security** is set to **Password Protection** then also change `lmsUsername` and `lmsPassword` to the required credentials.
   1. Click on the settings icon in the bottom-left, change the **Name** to `Squeezebox Control`, and then Close the window. <br> (Do **NOT** use the Add to Siri option within Scriptable; it will fail because Scriptable is blocked from requesting dictation when invoked directly from Siri.)
1. Install the [Squeezebox Control](https://www.icloud.com/shortcuts/4b66dc7c872747d48228d204e58c8021) Shortcut. <br> (The **Allow Untrusted Shortcuts** option must be enabled within Shortcut's settings.)

### Usage

Assuming that both the Shortcut and Scriptable script have been correctly installed, then invoke them by saying **Hey Siri, Squeezebox Control**. Siri should then prompt for the action to perform.

The script should be able to handle most natural ways of phrasing commands, but here are some examples:

| Activity | Example Commands |
| --- | --- |
| Turn a player on or off <br> :battery: | Turn *Kitchen* on <br> Switch on the *Lounge* squeezebox <br> Power off *Bedroom* |
| Ask about the current track <br> :speech_balloon: | What is playing in the *Office*? <br> What's the *Kitchen* player doing? <br> What am I listening to? <br> What's currently playing? |
| Change the volume <br> :sound: / :loud_sound: | Set *Lounge* volume to *50%* <br> Change the volume to *70* in the *Kitchen* <br> Louder <br> Reduce volume of *Office* |
| Start or stop the current playlist <br> :arrow_forward: / :stop_button: / :pause_button: | Play <br> Stop playing in the *Bedroom* <br> *Kitchen* pause |
| Skip tracks in the playlist <br> :previous_track_button: / :arrow_right_hook: / :next_track_button:  | Skip to previous song <br> Next <br> Restart on *Lounge* squeezebox <br> Play this track from the beginning |
| Load a new playlist <br> :radio: / :studio_microphone: / :woman_singer: / :cd: / :musical_note: | *Lounge* play playlist *Party Mix* <br> Play genre *Country* <br> Artist *Queen* on *Bedroom* player <br> On the *Lounge* squeezebox play songs by *Johnny Cash* <br> *Kitchen* play album *Money For Nothing* by *Dire Straits* <br> Song *Seven Nation Army* <br> Play *Kylie Minogue* on Bedroom |

All commands apply to either a single Squeezebox player or a sync group. If the name of the player is omitted then the script attempts to make a sensible choice based on which players are switched on and whether they are currently playing anything. Only the power on/off commands require the player to be explicitly identified.

### Additional Shortcuts

Interaction with Siri can be made more organic by creating additional Shortcuts for common interactions. These can have some or all of the command hard-coded, e.g.:
* :speech_balloon: [Squeezebox Now Playing](https://www.icloud.com/shortcuts/688e30b6553049dcb2bcd852f511c02c)
* :loud_sound: [Squeezebox Volume](https://www.icloud.com/shortcuts/7009050abe304a8b81d05188c59b7eb7)
* :arrow_forward: [Squeezebox Play](https://www.icloud.com/shortcuts/37e5c92bc6d5473892b774251ed2bc8c)
   * :arrow_forward: [Squeezebox Play Playlist](https://www.icloud.com/shortcuts/78415ce7a5414c9e8a3f3647e9fc5aae) ‡
   * :arrow_forward: [Squeezebox Play Genre](https://www.icloud.com/shortcuts/329e56610acb4e109be77d0c3fe2c927) ‡
   * :arrow_forward: [Squeezebox Play Artist](https://www.icloud.com/shortcuts/9db0a81765104c2ba6f43e3d706a3d74) ‡
   * :arrow_forward: [Squeezebox Play Album](https://www.icloud.com/shortcuts/24676022db5d425aab8c6c645f0f508d) ‡
   * :arrow_forward: [Squeezebox Play Song](https://www.icloud.com/shortcuts/a17d7f791e95475a92dffb1fd0a411ea) ‡
* :stop_button: [Squeezebox Stop](https://www.icloud.com/shortcuts/4c529ad29eab4d1d90f7fcd4fec66f07)
* :pause_button: [Squeezebox Pause](https://www.icloud.com/shortcuts/d57d08cbef8e496c9edaf3b1eea44bc3)
* :previous_track_button: [Squeezebox Previous](https://www.icloud.com/shortcuts/842aa0d39d18414dbf618a70fde02514)
* :arrow_right_hook: [Squeezebox Restart](https://www.icloud.com/shortcuts/359d2a485e954878a26bf023389258b6)
* :next_track_button: [Squeezebox Next](https://www.icloud.com/shortcuts/763f97dc6c994877b5d56390de5f9e02)

‡ Use of these shortcuts also requires the *Squeezebox Play* shortcut to be installed.

None of these shortcuts ask for the player to control, so they are really only suitable when there is a single active sync group.

## Notes

This script is intended to be invoked from Siri via the Shortcuts app, with the command to perform (e.g. obtained via an *Ask* action) passed as input. However, it can also be run directly from within the Scriptable app, in which case dictation is used to obtain the command.

If the shortcut is invoked on a HomePod then both the Shortcuts and Scriptable apps actually run on the associated iPhone.  Unfortunately it is not currently possible to determine which HomePod is being used, or even that the voice interaction is occurring on a HomePod, so it is not possible to automatically select that player.

The behaviour of this script is affected by various Logitech Media Server settings, especially the **Search Within Words** option.

## Reporting Problems

If something doesn't work as expected then please try to reproduce the issue by running the script directly within the Scriptable app. If it still fails then please include the contents of the **Log** window in any report. This includes cases where the script does not understand a command that has been phrased in a natural way.

## License

> ISC License (ISC)<br>Copyright © 2019 Alexander Thoukydides
>
> Permission to use, copy, modify, and/or distribute this software for any purpose with or without fee is hereby granted, provided that the above copyright notice and this permission notice appear in all copies.
>
> THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
