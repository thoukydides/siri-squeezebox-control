// Logitech Media Server control from iOS Scriptable
// Copyright © 2019 Alexander Thoukydides

'use strict';

// Logitech Media Server configuration
const lmsHostname = 'i7pc.local.thouky.co.uk';
const lmsPort = 9000;
const lmsUsername = '<username>';
const lmsPassword = '<password>';

// Volume increase/decrease step size (volume range is 0 to 100)
const volumeStep = 10;

// Single digit numbers as words
const digits = 'zero one two three four five six seven eight nine'.split(' ');

// Custom error type that can be used unembellished as the response
function Response(message) {
    this.name = 'Response';
    this.message = message;
}
Response.prototype = new Error();

// Ensure that any errors are properly reported
let response = '';
try {
    // Command to perform
    let input = args.shortcutParameter;
    if (!input) {
        if (config.runsWithSiri) throw new Response('Scriptable script ' + Script.name() + ' cannot be invoked directly from Siri. Instead of using the "Add to Siri" option within Scriptable, ensure that the "Allow Untrusted Shortcuts" option is enabled within the Shortcut app\'s settings, and then install a shortcut to Ask for input before invoking the script.');
        input = await Dictation.start();
    }
    console.log("Input '" + input + "'");

    // Obtain a list of players connected to the server
    let players = await getConnectedPlayers();
    if (!players.length) throw new Response('There are no Squeezebox players connected to the server.');

    // Commands that can be performed (listed in order to attempt match)
    const commands = {
        // Don't do anything
        '':                                    doCancel,
        'cancel':                              doCancel,
        
        // Turn a specific player on or off
        'power on PLAYER':                     doPowerOn,
        'power PLAYER on':                     doPowerOn,
        'PLAYER on':                           doPowerOn,
        'power off PLAYER':                    doPowerOff,
        'power PLAYER off':                    doPowerOff,
        'PLAYER off':                          doPowerOff,
        
        // Ask about current track
        'what is playing PLAYERLOC':           doStatus,
        'what am I listening to PLAYERLOC':    doStatus,
        'what is PLAYER doing':                doStatus,
        'what is playing':                     doStatus,
        'what am I listening to':              doStatus,
        
        // Change the volume
        'change volume to PERCENT PLAYERLOC':  doVolumePercent,
        'volume PERCENT PLAYERLOC':            doVolumePercent,
        '(?:change )?PERCENT volume PLAYERLOC':doVolumePercent,
        'change PLAYER volume to PERCENT':     doVolumePercent,
        'PLAYERLOC volume PERCENT':            doVolumePercent,
        'PLAYERLOC PERCENT volume':            doVolumePercent,
        'change volume PLAYERLOC to PERCENT':  doVolumePercent,
        'change volume to PERCENT':            doVolumePercent,
        'volume PERCENT':                      doVolumePercent,
        '(?:change )?PERCENT volume':          doVolumePercent,
        'louder PLAYERLOC':                    doVolumeUp,
        'increase PLAYER volume':              doVolumeUp,
        'PLAYERLOC louder':                    doVolumeUp,
        'louder':                              doVolumeUp,
        'quieter PLAYERLOC':                   doVolumeDown,
        'decrease PLAYERLOC volume':           doVolumeDown,
        'PLAYERLOC quieter':                   doVolumeDown,
        'quieter':                             doVolumeDown,
        
        // Start or stop the current playlist
        'play PLAYERLOC':                      doPlay,
        'PLAYERLOC play':                      doPlay,
        'play':                                doPlay,
        'stop PLAYERLOC':                      doStop,
        'PLAYERLOC stop':                      doStop,
        'stop':                                doStop,
        'pause PLAYERLOC':                     doPause,
        'PLAYERLOC pause':                     doPause,
        'pause':                               doPause,
        
        // Skip tracks in the playlist
        'next PLAYERLOC':                      doNextTrack,
        'PLAYERLOC next':                      doNextTrack,
        'next':                                doNextTrack,
        'previous PLAYERLOC':                  doPreviousTrack,
        'PLAYERLOC previous':                  doPreviousTrack,
        'previous':                            doPreviousTrack,
        'restart PLAYERLOC':                   doRestartTrack,
        'PLAYERLOC restart':                   doRestartTrack,
        'restart':                             doRestartTrack,
        
        // Load a new playlist (try these last because QUERY will match anything)
        'play QUERYTYPE QUERY PLAYERLOC':      doPlaylistLoad,
        'play QUERY PLAYERLOC':                doPlaylistLoad,
        'QUERYTYPE QUERY PLAYERLOC':           doPlaylistLoad,
        'PLAYERLOC play QUERYTYPE QUERY':      doPlaylistLoad,
        'PLAYERLOC play QUERY':                doPlaylistLoad,
        'PLAYERLOC QUERYTYPE QUERY':           doPlaylistLoad,
        'play QUERYTYPE QUERY':                doPlaylistLoad,
        'play QUERY':                          doPlaylistLoad,
        'QUERYTYPE QUERY':                     doPlaylistLoad,
        
        // Match everything else
        'INPUT':                               doDontUnderstand
    };


    // Regular expressions to match (and capture) interesting parts of a command
    const componentPatterns = {
        // The name of a single player
        PLAYERLOC: '(?:on |in |of )?PLAYER',
        PLAYER:    '(?:the |squeezebox |player )?'
                   + '(?<player>' + players.map(p => escapeRegex(p.name)).join('|') + ')'
                   + '(?: squeezebox| player)?',
        
        // A search query for something to be played
        QUERY:     '(?<query>\\S.*?)',
        
        // Types of item that can be played (including aliases)
        QUERYTYPE: '(?:the )?(?<querytype>playlist|genre|artist|tracks by|album|track)',
        
        // A number (as used for volume control)
        PERCENT:   '(?<percent>\\d+|' + digits.join('|') + ')(?:%| percent)?',
        
        // Any input
        INPUT:     '(?<input>.*)',
        
        // Alternative ways to say commands (not captured)
        power:     'power|turn|switch',
        change:    '(?:set|change|make|turn)',
        next:      '(?:skip to )?next(?: track)?|skip(?: this?(?: track)?)?',
        previous:  '(?:skip to )?previous(?: track)?',
        restart:   'restart(?:(?: this)? track)?|play(?:(?: this)? track)? from (?:the )?beginning',
        play:      'play|start playing',
        stop:      'stop(?: playing)?',
        pause:     'pause(?: playing)?',
        louder:    '(?:make it )?louder|increase volume|volume up',
        quieter:   '(?:make it )?quieter|(?:make it )?softer|decrease volume|volume down',
        increase:  'increase|raise',
        decrease:  'decrease|lower|reduce',
        volume:    '(?:the )?volume',
        'what is': '(?:what is|what\'s)(?: currently)?',
        doing:     'doing|playing',
        album:     'album|record',
        track:     'track|song|title|tune',
        tracks:    'tracks|songs|titles|tunes|music',
    };
    
    // Find the first matching command
    for (let command of Object.keys(commands)) {
        // Construct a regular expression for this command
        let pattern = command;
        Object.keys(componentPatterns).forEach(token => {
            let sub = componentPatterns[token];
            pattern = pattern.replace(new RegExp('\\b' + token + '\\b'), '(?:' + sub + ')');
        });
        let commandRegex = new RegExp('^' + pattern + '$', 'i');
        
        // Attempt to parse the input as this command
        let parsed = commandRegex.exec(input);
        if (parsed) {
            let params = parsed.groups || {};
            let paramsText = Object.keys(params).map(p => p + "='" + params[p] + "'").join(', ');
            console.log("Matched command '" + command + "' [" + paramsText + "]");
                        
            // Select the player to control
            let player;
            if ('player' in params) {
                player = players.find(p => p.name.toLowerCase() == params.player.toLowerCase());
                delete params.player;
            } else {
                player = players.find(p => p.power && p.isplaying)
                         || players.find(p => p.power)
                         || players[0];
                console.log("No player specified; defaulting to '" + player.name + "'");
            }
            await getSyncGroup(player, players);
            
            // Replace query type aliases by their canonical names
            if ('querytype' in params) {
                params.querytype = params.querytype.toLowerCase()
                                         .replace(/^(tracks by|songs by)$/, 'artist')
                                         .replace(/^(record)$/, 'album')
                                         .replace(/^(song|title|tune)$/, 'track');
            }
            
            // Ensure that numbers are actually numeric
            if ('percent' in params) {
                params.percent = toNumber(params.percent);
            }
            
            // Execute the command and stop looking for further matches
            response = await commands[command](player, params);
            break;
        }
    }
} catch (e) {
    // There was either an early return or an error
    if (e instanceof Response) {
        response = e.message;
    } else {
        console.error(e + (e.line ? ' at line ' + e.line : ''));
        const errors = {
            'The network connection was lost.':
                'The Logitech Media Server did not respond. This is probably due to a bug in the ' + Script.name() + ' script...',
            'A server with the specified hostname could not be found.':
                'Unable to find the Logitech Media Server; check that your ' + Device.model() + ' is connected to the same network and that the correct hostname has been specified in the ' + Script.name() + ' script.',
            'Could not connect to the server.':
                'Unable to contact the Logitech Media Server; check that it is running and that the correct port has been specified in the ' + Script.name() + ' script.',
            'The data couldn’t be read because it isn’t in the correct format.':
                'Unable to contact the Logitech Media Server; check that the correct port and path have been specified in the ' + Script.name() + ' script.',
        };
        response = errors[e.message] || 'Something unexpected happened. (' + e.message + ')';
    }
}

// Speak the response
console.log(response || '(No response)');
if (response) Speech.speak(response);
Script.complete();


// Escape a string for use in a regex
function escapeRegex(str) {
    return str.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
}

// Convert a string to a number (Siri uses words for single-digit numbers)
function toNumber(number) {
    let digit = digits.indexOf(number.toLowerCase());
    return 0 <= digit ? digit : Number(number);
}

// Combine list items as text
function textList(list, maxItems = 4, minItems) {
    // Truncate the list if it is too long
    let items = [...list];
    if (maxItems < items.length) {
        if (!minItems) minItems = maxItems - 1;
        let otherCount = items.length - minItems;
        items = items.slice(0, minItems);
        items.push(otherCount == 1 ? 'another' : otherCount + ' others');
    }
    
    // Concatenate the list entries
    let last = items.pop();
    if (!items.length) return last;
    return items.join(', ') + (1 < items.length ? ',' : '') + ' and ' + last;
}


// Obtain details of players currently connected to the server
async function getConnectedPlayers() {
    let players = await rpcPlayers();
    return players.filter(p => p.isplayer && p.connected);
}

// Obtain full details of a single player
async function getSyncGroup(player, players) {
    let status = await rpcStatus(player);
    Object.assign(player, status);
    
    // If the player is part of a sync group then construct a more descriptive name
    player.groupname = player.name;
    if (player.sync_master) {
        let master = players.find(p => p.playerid == player.sync_master);
        //let slaveIds = player.sync_slaves.split(',');
        if (master) player.groupname = master.name + ' sync group';
    }
    
    // Return the augmented details of this player
    return player;
}

// Describe the current playlist entry (if any)
async function getCurrentTrack(player) {
    // Check that the player is actually playing something
    let mode = await rpcMode(player);
    if (mode != 'play') return;
    
    // Construct and return a description of the current track
    let info = await rpcPlaylistInfo(player);
    let description = info.title || 'an unknown track';
    if (!info.remote) {
        if (info.album) description += ' from ' + info.album;
        if (info.artist) description += ' by ' + info.artist;
    }
    return description;
}

// Display the current playlist as a table
// (this makes a lot of server requests, which can make it too slow for Siri)
async function displayPlaylistTable(player) {
    // Choose which playlist entries to show
    const maxOffset = 3;
    let tracks = await rpcPlaylistTracks(player);
    if (!tracks) return;
    let currentIndex = await rpcPlaylistIndex(player);
    let begin = Math.max(0, currentIndex - maxOffset);
    let end = Math.min(tracks, currentIndex + maxOffset + 1);
    
    // Create a table with a row for each playlist entry
    let table = new UITable;
    let mode = await rpcMode(player);
    let playStatus = mode == 'play' ? '🔊 ' : '🔇 ';
    for (let index = begin; index < end; ++index) {
        let info = await rpcPlaylistInfo(player, index);
        let row = new UITableRow;
        row.cellSpacing = 5;
        row.isHeader = index == currentIndex;
        let indexCell = row.addText((index == currentIndex ? playStatus : '') + (index + 1) + '.');
        indexCell.rightAligned();
        indexCell.widthWeight = 3;
        if (Device.isPad()) {
            row.addText(info.title).widthWeight = 10;
            row.addText(info.artist).widthWeight = 8;
            row.addText(info.album).widthWeight = 8;
        } else {
            row.addText(info.title, info.artist + ' - ' + info.album).widthWeight = 15;
        }
        table.addRow(row);
    }
    
    // Display the table
    table.present();
}

// Failed to 
function doDontUnderstand(player, {input}) {
    console.log("No command matched");
    return "Sorry, I don't know how to '" + input + "'.";
}

// Null action
function doCancel() {
    console.log("Cancel");
    return "OK, I won't do anything.";
}

// Turn a player on
async function doPowerOn(player) {
    console.log("[" + player.name + "] Power on");
    await rpcPower(player, 1);
    if (player.power) return player.name + ' was already on.'
    return player.name + ' is now on.';
}

// Turn a player off
async function doPowerOff(player) {
    console.log("[" + player.name + "] Power off");
    if (!player.canpoweroff) return player.name + ' cannot be powered off.';
    await rpcPower(player, 0);
    if (!player.power) return player.name + ' was already off.'
    return player.name + ' is now off.';
}

// Describe the current status
async function doStatus(player) {
    console.log("[" + player.name + "] Status");
    let description = await getCurrentTrack(player);
    if (!description) {
        // Describe non-playing modes
        if (!player.power) return player.name + ' is currently switched off.';
        let mode = await rpcMode(player);
        if (mode == 'stop') return player.groupname + ' is currently stopped.';
        if (mode == 'pause') return player.groupname + ' is currently paused.';
    }
    await displayPlaylistTable(player);
    return 'Currently playing ' + description + ' on ' + player.groupname + '.';
}

// Set player volume to the specified percentage
async function doVolumePercent(player, {percent}) {
    console.log("[" + player.name + "] Volume " + percent + "%");
    let oldPercent = await rpcVolume(player);
    let newPercent = await rpcVolume(player, percent);
    if (oldPercent == percent) return player.name + ' volume was already set to ' + percent + '%.';
    return player.name + ' volume ' + (oldPercent < percent ? 'increased' : 'decreased') + ' to ' + percent + '%.';
}

// Increase the player volume
async function doVolumeUp(player) {
    console.log("[" + player.name + "] Volume up");
    let oldPercent = await rpcVolume(player);
    let newPercent = await rpcVolume(player, '+' + volumeStep);
    if (oldPercent == 100) return player.name + ' was already at maximum volume.';
    return player.name + ' volume increased to ' + newPercent + '%.';
}

// Decrease the player volume
async function doVolumeDown(player) {
    console.log("[" + player.name + "] Volume down");
    let oldPercent = await rpcVolume(player);
    let newPercent = await rpcVolume(player, '-' + volumeStep);
    if (oldPercent == 0) return player.name + ' was already at minimum volume.';
    return player.name + ' volume decreased to ' + newPercent + '%.';
}

// Start playing the current playlist
async function doPlay(player) {
    console.log("[" + player.name + "] Play");
    let oldMode = await rpcMode(player);
    let newMode = await rpcMode(player, 'play');
    let description = await getCurrentTrack(player);
    if (newMode != 'play') return 'Failed to start ' + player.name + ' playing.';
    if (oldMode == 'play' || !description) return player.groupname + ' already playing.';
    return 'Started playing ' + description + ' on ' + player.groupname + '.';
}

// Stop playing the current playlist
async function doStop(player) {
    console.log("[" + player.name + "] Stop");
    let oldMode = await rpcMode(player);
    let newMode = await rpcMode(player, 'stop');
    if (newMode != 'stop') return 'Failed to stop ' + player.name + '.';
    if (oldMode == 'stop') return player.groupname + ' already stopped.';
    return player.groupname + ' stopped.';
}

// Pause a player
async function doPause(player) {
    console.log("[" + player.name + "] Pause");
    let oldMode = await rpcMode(player);
    let newMode = await rpcMode(player, 'pause');
    if (newMode != 'pause') return 'Failed to pause ' + player.name + '.';
    if (oldMode == 'pause') return player.groupname + ' already paused.';
    return player.groupname + ' now paused.';
}

// Skip forward to the next track in the playlist
async function doNextTrack(player) {
    console.log("[" + player.name + "] Next track");
    let tracks = await rpcPlaylistTracks(player);
    if (!tracks) return player.name + ' playlist is empty.';
    let newIndex = await rpcPlaylistIndex(player, '+1');
    let description = await getCurrentTrack(player);
    //return 'Now playing track ' + (newIndex + 1) + ' of ' + tracks + ' on ' + player.groupname + '.';
    return 'Now playing ' + description + ' on ' + player.groupname + '.';
}

// Skip backwards to the previous track in the playlist
async function doPreviousTrack(player) {
    console.log("[" + player.name + "] Previous track");
    let tracks = await rpcPlaylistTracks(player);
    if (!tracks) return player.name + ' playlist is empty.';
    let newIndex = await rpcPlaylistIndex(player, '-1');
    let description = await getCurrentTrack(player);
    //return 'Now playing track ' + (newIndex + 1) + ' of ' + tracks + ' on ' + player.groupname + '.';
    return 'Now playing ' + description + ' on ' + player.groupname + '.';
}

// Restart the current track in the playlist
async function doRestartTrack(player) {
    console.log("[" + player.name + "] Restart track");
    let tracks = await rpcPlaylistTracks(player);
    if (!tracks) return player.name + ' playlist is empty.';
    await rpcTime(player, '0');
    await rpcMode(player, 'play');
    let description = await getCurrentTrack(player);
    return (player.isplaying ? 'Restarted ' : 'Started playing ') + description + ' on ' + player.groupname + '.';
}

// Load a new playlist
async function doPlaylistLoad(player, {querytype, query}) {
    let querytypes = querytype ? [querytype] : ['playlist', 'genre', 'artist', 'album', 'track'];
    console.log("[" + player.name + "] Playlist load " + querytypes.join('|') + " = '" + query + "'");
    
    // First attempt a simple search
    let artistName;
    let [type, ids, names] = await filterDatabaseSearch(querytypes, query);

    // If no matches found then check for a compound query
    let compoundParsed = /^(.*\S) by (\S.*)$/i.exec(query);
    let querytypes2 = querytypes.filter(type => /^album|track$/.test(type));
    if (!ids.length && compoundParsed && querytypes2.length) {
        // First attempt to search for the artist
        let [, query2, artist] = compoundParsed;
        console.log("[" + player.name + "] Playlist load " + querytypes2.join('|') + " = '" + query2 + "' and artist = '" + artist + "'");
        let [, artistIds, artistNames] = await filterDatabaseSearch(['artist'], artist);
        while (artistIds.length) {
            // Next search for matching item(s) by that artist
            let queryIds = { artist: artistIds.shift() };
            artistName = artistNames.shift();
            [type, ids, names] = await filterDatabaseSearch(querytypes2, query2, queryIds);
            if (ids.length) break;
        }
    }
    console.log('Found ' + (ids.length || 0) + ' ' + type + '(s)');
    if (!ids.length) return 'Unable to locate ' + query + ' on your server.';
    
    // Play the matching item(s)
    let count = await rpcPlaylistLoad(player, type, ...ids);
    if (!count) return 'No tracks added to ' + player.groupname + ' playlist.';
    
    // Construct a description of what is now playing
    let description;
    if (count == 1) {
        // Provide full details if there only a single track was added
        let trackDescription = await getCurrentTrack(player);
        description = trackDescription || query;
    } else {
        // Multiple tracks so describe the search result(s) instead
        let namesDescription = textList(names);
        description = {
            playlist: count + ' tracks from playlist ' + namesDescription,
            genre:    ids.length == 1 ? count + ' ' + names[0].toLowerCase() + ' tracks'
                                      : count + ' tracks in genres ' + namesDescription,
            artist:   count + ' tracks by ' + namesDescription,
            album:    'album ' + namesDescription,
            track:    count + ' tracks matching ' + query
        }[type];
        if (artistName) description += ' by ' + artistName;
    }
    
    // Return a description of what is playing
    return 'Playing ' + description + ' on ' + player.groupname + '.';
}

// Search for matching ids of any type
async function filterDatabaseSearch(querytypes, query, queryIds = {}) {
    // Construct regular expressions to fuzzy match the query
    let words = query.split(/[\s\.,:;]+/);
    let patterns = words.map(word => {
        let digit = digits.indexOf(word);
        let pattern = escapeRegex(word);
        if (digit == -1) return pattern;
        return '(?:' + digit + '|' + pattern + ')';
    });
    let fuzzyRegex = new RegExp(patterns.map(w => '\\b' + w + '\\b').join('.*'), 'i');
    let strictRegex = new RegExp('^(?:the )?' + patterns.join(' ') + '$', 'i');
    
    // Search the database for matching items
    let result = [null, [], []];
    for (let type of querytypes) {
        let items = await rpcDatabaseSearch(type, query, queryIds);
        let filtered = items.filter(item => strictRegex.test(item.name));
        if (!filtered.length) filtered = items.filter(item => fuzzyRegex.test(item.name));
        if (type == 'playlist' ? filtered.length == 1 : filtered.length) {
            // Decompose the results into separate id and name arrays
            result = [type, filtered.map(item => item.id), filtered.map(item => item.name)];
            break;
        }
    }
    return result;
}

// Search for matching ids of the specified type (genre, artist, album, track, playlist)
// (The server's search does not appear to work with playlist names, so all results are returned for playlist queries)
async function rpcDatabaseSearch(type, query, queryIds = {}) {
    const itemsPerResponse = 100;
    let items = [], resultsCount;
    let serverType = type == 'track' ? 'title' : type;
    let taggedParam = [];
    if (query && type != 'playlist') taggedParam.push('search:' + query);
    if (queryIds) taggedParam.push(...Object.keys(queryIds).map(t => t + '_id:' + queryIds[t]));
    do {
        let result = await rpc('', serverType + 's', items.length, itemsPerResponse, ...taggedParam);
        resultsCount = result.count;
        let loop = result[serverType + 's_loop'] || [];
        if (resultsCount && !loop.length) console.warn('No details returned by server')
        items.push(...loop.map(item => Object.assign({}, item, { name: item[serverType] })));
    } while (items.length < resultsCount);
    console.log((resultsCount || 0) + ' ' + type + "s matching '" + query + "'");
    return items;
}

// Query all players known to the server
async function rpcPlayers() {
    const itemsPerResponse = 5;
    let players = [], playersCount;
    do {
        let result = await rpc(null, 'players', players.length, itemsPerResponse);
        playersCount = result.count;
        players.push(...result.players_loop);
    } while (players.length < playersCount);
    return players;
}

// Query status of a single player (excluding playlist)
async function rpcStatus(player) {
    let result = await rpc(player, 'status');
    return result;
}

// Query sync groups
async function rpcSyncGroups() {
    let result = await rpc('', 'syncgroups', '?');
    let groups = [];
    let loop = result.syncgroups_loop || [];
    loop.forEach(async group => {
        let members = group.sync_members.split(',').sort();
        //let memberNames = group.sync_member_names.split(',').sort();
        groups.push(members);
    });
    return groups;
}

// Turn a player on or off
async function rpcPower(player, on) {
    return rpc(player, 'power', on ? 1 : 0);
}

// Change or query volume
async function rpcVolume(player, volume) {
    if (volume !== undefined) await rpc(player, 'mixer', 'volume', volume);
    let result = await rpc(player, 'mixer', 'volume', '?');
    return Number(result._volume);
}

// Change or query mode (play, stop, or pause)
async function rpcMode(player, mode) {
    if (mode !== undefined) await rpc(player, mode, 1); // (the last parameter is only required for 'pause')
    let result = await rpc(player, 'mode', '?');
    return result._mode;
}

// Change or query position in current track
async function rpcTime(player, seconds) {
    if (seconds !== undefined) await rpc(player, 'time', seconds);
    let result = await rpc(player, 'time', '?');
    return result;
}

// Details of the currently playing track
async function rpcPlaylistInfo(player, index) {
    let info = {};
    for (let type of ['artist', 'album', 'title', 'remote']) {
        let args = index !== undefined ? ['playlist', type, index] : [type];
        let result = await rpc(player, ...args, '?');
        info[type] = result['_' + type];
    }
    return info;
}

// Change or query position in playlist
async function rpcPlaylistIndex(player, index) {
    if (index !== undefined) await rpc(player, 'playlist', 'index', index);
    let result = await rpc(player, 'playlist', 'index', '?');
    return Number(result._index);
}

// Query number of tracks in playlist
async function rpcPlaylistTracks(player) {
    let result = await rpc(player, 'playlist', 'tracks', '?');
    return Number(result._tracks);
}

// Start playing the specified ids
async function rpcPlaylistLoad(player, type, ...ids) {
    let count = 0;
    let cmd = 'load';
    if (type == 'track') ids = [ids.join(',')];
    for (let id of ids) {
        let result = await rpc(player, 'playlistcontrol', 'cmd:' + cmd, type + '_id:' + id);
        count += result.count;
        cmd = 'add';
    }
    return count;
}

// Issue an RPC request to the Logitech Media Server and return the result
async function rpc(player, ...command) {
    // Player may be null, a playerid string, or a player object
    let playerid = player ? (typeof player === 'string' ? player : player.playerid) : '';

    // Build the request
    let request = new Request('http://' + lmsHostname + ':' + lmsPort + '/jsonrpc.js');
    request.method = 'POST';
    if (lmsPassword) {
        let auth = Data.fromString(lmsUsername + ':' + lmsPassword).toBase64String();
        request.headers = { Authorization: 'Basic ' + auth };
    }
    request.body = JSON.stringify({
        id: 1,
        method: 'slim.request',
        params: [playerid, command]
    });
    
    // Log and return the result
    console.log(request.body);
    let result = await request.loadJSON();
    console.log(result);
    return result.result;
}
