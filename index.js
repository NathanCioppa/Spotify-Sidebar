//token will be set to the user's authorization token after logging in
let token = null

//stores information about the user, currently playing track, playlists, and playback controls as they use the app
let info = {
    user: '',
    current: {
        data: '',
        track: 'Play something on Spotify',
        artist: '',
        cover: 'https://www.hypebot.com/wp-content/uploads/2019/11/spotify-1759471_1920.jpg',
        link: '',
        position: '',
        length: '',
        context: {
            type: '',
            name: '',
            image: '',
            artist: ''
        }
    },
    playlists:[],
    playback: {
        data: '',
        playing: false,
        shuffle: false,
        queue: [],
        skip: []
    },
}

//stores information about the users customization settings
let theme = {
    defautlColor: 'rgb(75, 255, 75)',
    customColors: [],
    color: 'rgb(75, 255, 75)',
    red: '75',
    green: '225',
    blue: '75',
    iconColor: 'black',
    background: {
        direction:'to right',
    }
}

//shortcuts for certain functions because im lazy
function elem(elementId) {
    return document.getElementById(elementId)
}
function elemClass(className) {
    return document.getElementsByClassName(className)
}
function getLocal(key) {
    return window.localStorage.getItem(key)
}
function create(element) {
    return document.createElement(element)
}
async function get(endpoint) {
    try {
        const result = await fetch(endpoint, {
        method: 'GET',
        headers: {'Authorization' : 'Bearer ' + token}
    })
    return await result.json()

    } catch (error) {
        console.log('ERROR GET: '+endpoint)
    }
}
async function post(endpoint) {
    try {
        await fetch(endpoint, {
        method: 'POST',
        headers: {'Authorization' : 'Bearer ' + token}
    })
    } catch (error) {
        console.log('ERROR POST: '+endpoint)
    }
}


//automatically tries to log in if the user has a token in local storage
function pageLoad() {
    const storedToken = window.localStorage.getItem('token')
    if(storedToken !== null) {
        document.getElementById('token-input').value = storedToken
        signIn()
    }

//sets previous customization settings if there are any in local storage
    theme.background.direction = getLocal('gradient') !== null ? getLocal('gradient') : theme.background.direction

    if(getLocal('alignment') !== null) {document.body.style.alignItems = getLocal('alignment')}
    elem('align-overall').style.rotate = document.body.style.alignItems === 'flex-end' ? '270deg' : '90deg'

    if(getLocal('navbar-align') !== null) {elem('actions').style.flexDirection = getLocal('navbar-align')}
    if(getLocal('playback-align') !== null) {elem('playing-alignment').style.flexDirection = getLocal('playback-align')}
    elem('current-words').style.marginLeft = elem('playing-alignment').style.flexDirection === 'row-reverse' ? '0' : '1vh'

    if(getLocal('color') !== null) {
        theme.color = getLocal('color')
        theme.red = getLocal('red')
        theme.green = getLocal('green')
        theme.blue = getLocal('blue')

        const color = theme.color.includes('#') ? theme.color : rgbToHex(theme.red, theme.green, theme.blue)

        elem('color-picker').value = color
        elem('set-color-icon').style.color = color

        changeTheme(true)

        for(let i = 0; i < 20; i++) {
            const savedColor = window.localStorage.getItem('saved-color-'+i)
            if(savedColor !== null) {
                theme.customColors[i] = savedColor
                mapPreviousColors(savedColor)
            }
        }
    }
    if(getLocal('iconColor') !== null) {
        theme.iconColor = getLocal('iconColor')
        setIconColor(true)
    }
    elem('greeting').innerText = 'Good '+getGreeting()+','
}

async function signIn() {
    const inputToken = document.getElementById('token-input').value

    const result = await fetch('https://api.spotify.com/v1/me', {
        method: 'GET',
        headers: {'Authorization' : 'Bearer ' + inputToken}
    })
    const data = await result.json()

//checks if the token is valid by checking if a display name is returned
//if the token is valid, the user is logged in and the app loads, token is stored in local storage
    if(data.display_name !== undefined) {
        token = inputToken
        info.user = data
        window.localStorage.setItem('token', token)

        const playing = await get('https://api.spotify.com/v1/me/player')
        info.playback.playing = playing === undefined ? false : playing.is_playing ? true : false
        
        getPlaylists()
        getCurrent()
        showContent()
        setInterval(getCurrent, 1000)
        setInterval(getQueue, 5000)
        setInterval(playAnimation, 1)
    } else {
//token is removed from local storage and input is cleared if the user submits an invalid token
        console.log('invalid access token')
        window.localStorage.removeItem('token')
        elem('token-input').value = ''
    }
    getGreeting()
}


//gets the currently playing track and sets its information in the info object
async function getCurrent() {
    const playing = await get('https://api.spotify.com/v1/me/player')
    if(playing === undefined) return;

    info.playback.shuffle = playing.shuffle_state
    if(playing.is_playing) {
        info.playback.playing = true
        const data = await get('https://api.spotify.com/v1/me/player/currently-playing')
        const current = info.current

//current track info is only updated if a different song is playing 
//if the information is updated, the app checks if the song should be skipped, then updates the queue
        if(current.link !== data.item.external_urls.spotify) {
            current.data = data 
            current.track = data.item.name
            current.artist = data.item.artists[0].name
            current.cover = data.item.album.images[1].url
            current.link = data.item.external_urls.spotify

            if(data.context !== null) {
                current.context.type = data.context.type === 'album' ? data.item.album.album_type : data.context.type
                const contextItem = await get(data.context.href)
                console.log(contextItem)
                current.context.name = contextItem.name
                current.context.image = contextItem.images[0].url
                current.context.artist = current.context.type === 'playlist' ? 'By '+contextItem.owner.display_name : contextItem.artists[0].name
            }
            else{
                current.context.type = 'browsing'
                current.context.name = ''
            }

            await checkForSkip(data.item.uri)
            await getQueue()
            reloadContentsOnTrackChange()
        }
        current.length = data.item.duration_ms
        current.position = data.progress_ms

    } else {info.playback.playing = false}
    reloadContents()
}

async function toggleShuffle(shuffle) {
    await fetch('https://api.spotify.com/v1/me/player/shuffle?state='+shuffle, {
        method: 'PUT',
        headers:{
            'Authorization' : 'Bearer ' + token
        }
    })
}

async function getPlaylists() {
    const playlists = await get('https://api.spotify.com/v1/me/playlists?limit=50')
    playlists.items.map((playlist)=>{
        const image = playlist.images[0] !== undefined ? playlist.images[0].url : 'https://www.hypebot.com/wp-content/uploads/2019/11/spotify-1759471_1920.jpg'
        const name = playlist.name
        const uri = playlist.uri
        
        info.playlists.push({image,name,uri})
    })
    showPlaylists()
}

//constructs and displays an element for each of the user's playlists
//each playlist has buttons to start playing with and without shuffle
function showPlaylists() {
    const playlists = info.playlists
    playlists.map((playlistInfo) => {
        const playlist = create('div')
        playlist.className = 'playlist'

        const infoDiv = create('div')
        infoDiv.className = 'playlist-info-div'

        const image = create('img')
        image.className = 'list-image'
        image.src = playlistInfo.image

        const name = create('span')
        name.className = 'list-name'
        name.innerText = playlistInfo.name
        name.title = playlistInfo.name

        const buttons = create('div')
        buttons.className = 'playlist-buttons-container'

        const playButton = create('button')
        playButton.id = playlistInfo.uri
        playButton.className = 'playlist-button'
        playButton.setAttribute('onclick', 'playItem(this.id, false)')
        const playIcon = create('i')
        playIcon.className = 'fa-solid fa-play icon playlist-button-icon'
        playButton.append(playIcon)

        const shuffleButton = create('button')
        shuffleButton.id = playlistInfo.uri
        shuffleButton.className = 'playlist-button'
        shuffleButton.setAttribute('onclick', 'playItem(this.id, true)')
        const shuffleIcon = create('i')
        shuffleIcon.className = 'fa-solid fa-shuffle icon playlist-button-icon'
        shuffleButton.append(shuffleIcon)

        buttons.append(shuffleButton, playButton)
        infoDiv.append(name, buttons)
        playlist.append(image, infoDiv)

        elem('playlists').append(playlist)
    })
}

//updates the playback queue object, setting it to the current queue
async function getQueue() {
    let newQueue = []
    const data = await get('https://api.spotify.com/v1/me/player/queue')
    data.queue.map((trackInfo) => {
        const image = trackInfo.album.images[1].url
        const name = trackInfo.name
        const artist = trackInfo.artists[0].name
        const id = trackInfo.uri
        newQueue.push({image,name,artist,id})
    })
    info.playback.queue = newQueue
    showQueue()
}

//constructs and displays an element for each track in the user's queue
//queued tracks have buttons to be played next, or automatically skipped next time they are played
function showQueue() {
    elem('queue').innerHTML = ''

    const queue = info.playback.queue
    queue.map((track) => {
        const container = create('div')
        container.className = 'queued-track'
        container.style.backgroundColor = info.playback.skip.includes(track.id) ? 'rgb(225,0,0,0.2)' : 'transparent'

        const image = create('img')
        image.className = 'list-image'
        image.src = track.image

        const name = create('span')
        name.className = 'list-name'
        name.innerText = track.name
        name.title = track.name

        const artist = create('span')
        artist.className = 'list-artist'
        artist.innerText = track.artist
        artist.title = track.artist

        const queueNextButton = create('button')
        queueNextButton.title = 'Play next in queue'
        queueNextButton.className = 'queue-button'
        queueNextButton.setAttribute(`onclick`, `nextInQueue('${track.id}')`)
        const queueNextIcon = create('i')
        queueNextIcon.className = 'fa-solid fa-arrow-up-short-wide icon queue-icon'
        queueNextButton.append(queueNextIcon)

        const queueRemoveButton = create('button')
        queueRemoveButton.className = 'queue-button'
        queueRemoveButton.title = !info.playback.skip.includes(track.id) ? 'Skip on next play' : "Don't skip"
        queueRemoveButton.setAttribute('onclick',`addToSkip('${track.id}')`)
        const removeButtonIcon = create('i')
        removeButtonIcon.className = 'fa-solid fa-circle-minus icon queue-icon'
        queueRemoveButton.append(removeButtonIcon)

        const buttonDiv = create('div')
        buttonDiv.style.flexDirection = 'row'
        buttonDiv.style.marginLeft = '0.5vh'
        buttonDiv.append(queueNextButton, queueRemoveButton)

        const infoDiv = create('div')
        infoDiv.append(name, artist, buttonDiv)

        container.append(image, infoDiv)
        elem('queue').append(container)
    })
}

async function next() {
    await post('https://api.spotify.com/v1/me/player/next')
    await getCurrent()
    reloadContents()
}

async function previous() {
    await post('https://api.spotify.com/v1/me/player/previous')
    await getCurrent()
    reloadContents()
}

async function pauseResume() {
    const data = await get('https://api.spotify.com/v1/me/player')
    if(data === undefined) return 
    data.is_playing ? pause() : resume()
}

async function pause() {
    try {
        await fetch('https://api.spotify.com/v1/me/player/pause', {
        method: 'PUT',
        headers: {
            'Authorization' : 'Bearer ' + token}
    })
    info.playback.playing = false
    reloadContents()
    } catch (error) {
        console.log('error pause')
    }
}

async function resume() {
    try {
        await fetch('https://api.spotify.com/v1/me/player/play', {
        method: 'PUT',
        headers: {
            'Authorization' : 'Bearer ' + token}
    })
    info.playback.playing = true
    reloadContents()
    } catch (error) {
        console.log('error resume')
    }
}

//plays an item using its uri as the id parameter and starts shuffling if shuffle parameter is true
async function playItem(id, shuffle) {
    await toggleShuffle(shuffle)
    try {
        await fetch('https://api.spotify.com/v1/me/player/play', {
            method: 'PUT',
            headers: {
                'Authorization' : 'Bearer ' + token
            },
            body: JSON.stringify({
                'context_uri' : id,
            }),
        })
    } catch (error) {
        console.log(error)
    }
}

//sets a track to play next in the queue
async function nextInQueue(trackUri) {
    await post(`https://api.spotify.com/v1/me/player/queue?uri=${trackUri}`)
    await getQueue()
}

//adds to the array of songs that will be automatically skipped next time they are played
//songs are added to the array by a button in the queue
function addToSkip(trackUri) {
    const skips = info.playback.skip
    !skips.includes(trackUri) ? info.playback.skip.push(trackUri) : info.playback.skip = skips.filter(item => {
        return item !== trackUri
    })
    showQueue()
}

//checks if the current song should be automatically skipped
async function checkForSkip(currentUri) {
    const skip = info.playback.skip
    if(skip.includes(currentUri)) {
        info.playback.skip = skip.filter(item => {
            return item !== currentUri
        })
        await next()
    }
}

//changes which type of items are displayed from a search (songs, albums, artists, playlists)
function changeSearch(elementToShow) {
    const views = elemClass('show-search')
    for(let i = 0; i < views.length; i++) {
        views[i].style.display = views[i].id.slice(views[i].id.indexOf('-')+1, views[i].id.length) === elementToShow ? 'flex' : 'none'
    }

    const buttons = elemClass('change-search-button')
    for(let i = 0; i < buttons.length; i++) {
        buttons[i].style.backgroundColor = buttons[i].id === elementToShow ? 'rgba(255, 255, 255, 0.3)' : 'rgba(255, 255, 255, 0.1)' 
    }
}

//check if the search bar is focused, if it is, then the enter key will call the search function
let enterListener = false
function toggleEnterListener(activate) {
    enterListener = activate
}
addEventListener('keypress', e => {
    if(e.key === 'Enter' && enterListener) {
        search()
    }
})

async function search() {
    const searchTerm = elem('search-bar').value
    const data = await get(`https://api.spotify.com/v1/search?q=${searchTerm}&type=track,album,artist,playlist`)
    showSearchTracks(data.tracks.items)
    showSearchAlbums(data.albums.items)
    showSearchArtists(data.artists.items)
    showSearchPlaylists(data.playlists.items)
}

//template for making elements displayed from a search
function createSearchItems(name, artist, imageUrl) {
    const container = create('div')
    container.className = 'searched-item'

    const imageElement = create('img')
    imageElement.src = imageUrl
    imageElement.className = 'list-image'

    const nameElement = create('span')
    nameElement.innerText = name
    nameElement.className = 'list-name'
    nameElement.title = name

    const artistElement = create('span')
    artistElement.innerText = artist
    artistElement.className = 'list-artist'
    artistElement.title = artist

    const infoDiv = create('div')
    infoDiv.append(nameElement,artistElement)

    container.append(imageElement,infoDiv)
    return container
}

//template for making a play button for searched items
function createSearchPlayButton(itemUri, itemType) {
    const playButton = create('button')
        playButton.className = 'searched-item-button'
        playButton.title = 'Play '+itemType
        playButton.setAttribute('onclick', `playItem('${itemUri}',false)`)

    const playButtonIcon = create('i')
        playButtonIcon.className = 'fa-solid fa-play icon queue-icon'
        playButton.append(playButtonIcon)

    return playButton
}

//template for making a shuffle button for searched items
function createSearchShuffleButton(itemUri, itemType) {
    const shuffleButton = create('button')
        shuffleButton.className = 'searched-item-button'
        shuffleButton.title = 'Shuffle '+itemType
        shuffleButton.setAttribute('onclick', `playItem('${itemUri}',true)`)

    const shuffleButtonicon = create('i')
        shuffleButtonicon.className = 'fa-solid fa-shuffle icon queue-icon'
        shuffleButton.append(shuffleButtonicon)

    return shuffleButton
}

//creates and displays elements to show songs from a search
function showSearchTracks(tracks) {
    const searchTracks = elem('show-search-tracks')
    searchTracks.innerHTML =''
    tracks.map(track => {
        const trackElement = createSearchItems(track.name, track.artists[0].name, track.album.images[1].url)

//creates and appends a button which adds the song to the queue
        const queueNextButton = create('button')
        queueNextButton.className = 'searched-item-button'
        queueNextButton.title = 'Add to queue'
        queueNextButton.setAttribute('onclick', `nextInQueue('${track.uri}')`)
        const queueNextButtonIcon = create('i')
        queueNextButtonIcon.className = 'fa-solid fa-arrow-up-short-wide icon queue-icon'
        queueNextButton.append(queueNextButtonIcon)
        
        const buttonDiv = create('div')
        buttonDiv.className = 'searched-button-div'
        buttonDiv.append(queueNextButton)

        trackElement.childNodes[1].append(buttonDiv)
        searchTracks.append(trackElement)
    })
}

function showSearchAlbums(albums) {
    const searchAlbums = elem('show-search-albums')
    searchAlbums.innerHTML = ''
    albums.map(album => {
        const albumElement = createSearchItems(album.name, album.artists[0].name, album.images[1].url)

        const playButton = createSearchPlayButton(album.uri, 'album')
        const shuffleButton = createSearchShuffleButton(album.uri, 'album')

        const buttonDiv = create('div')
        buttonDiv.className = 'searched-button-div'
        buttonDiv.append(playButton, shuffleButton)
        albumElement.childNodes[1].append(buttonDiv)
        searchAlbums.append(albumElement)
    })
}

function showSearchArtists(artists) {
    const searchArtists = elem('show-search-artists')
    searchArtists.innerHTML = ''
    artists.map(artist => {
//display artist genres on searched artists
        let genres = ''
        for(let i = 0; i < 3; i++) {
            if (artist.genres[i] !== undefined) {
                genres += ', ' + artist.genres[i]
            }
        }
        genres = genres.slice(2, genres.length)
        const image = artist.images.length !== 0 ? artist.images[0].url : 'https://www.hypebot.com/wp-content/uploads/2019/11/spotify-1759471_1920.jpg'
        const artistElement = createSearchItems(artist.name, genres, image)

        const playButton = createSearchPlayButton(artist.uri, 'artist')
        const shuffleButton = createSearchShuffleButton(artist.uri, 'artist')
        
        const buttonDiv = create('div')
        buttonDiv.className = 'searched-button-div'
        buttonDiv.append(playButton, shuffleButton)
        artistElement.childNodes[1].append(buttonDiv)
        searchArtists.append(artistElement)
    })
}

function showSearchPlaylists(playlists) {
    const searchPlaylists = elem('show-search-playlists')
    searchPlaylists.innerHTML = ''
    playlists.map(playlist => {
        const image = playlist.images.length !== 0 ? playlist.images[0].url : 'https://www.hypebot.com/wp-content/uploads/2019/11/spotify-1759471_1920.jpg'
        const playlistElement = createSearchItems(playlist.name, playlist.owner.display_name, image)

        const playButton = createSearchPlayButton(playlist.uri, 'playlist')
        const shuffleButton = createSearchShuffleButton(playlist.uri, 'playlist')

        const buttonDiv = create('div')
        buttonDiv.className = 'searched-button-div'
        buttonDiv.append(playButton, shuffleButton)
        playlistElement.childNodes[1].append(buttonDiv)
        searchPlaylists.append(playlistElement)        

        searchPlaylists.append(playlistElement)
    })
}

function progressBar() {
    const c = document.querySelector('#progress-bar').getContext('2d')
    const width = elem('progress-bar').clientWidth
    elem('progress-bar').width=width
    const height = elem('progress-bar').clientHeight
    elem('progress-bar').height = height
    const colWidth = width/100
    const progress = Math.floor(((info.current.position/info.current.length)*100))*colWidth

    c.beginPath()
    c.clearRect(0,0,width, height)
    c.fillStyle='white'
    c.fillRect(0,0,progress,height)
    c.stroke()
}

function getGreeting() {
    const hour = new Date().getHours()
    return hour < 5 ? 'evening' : hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening'
}

//changes which view is shown when navbar buttons are pressed
function setView(element) {
    const buttons = elemClass('nav-icon')
    const selected = element.children[0]

    for(let i = 0; i < buttons.length; i++) {
        const color = theme.color === '' ? theme.defautlColor : theme.color
        buttons[i].style.color = buttons[i].id === selected.id ? color : theme.iconColor
    }

    const views = elemClass('view-div')
    for (let i = 0; i < views.length; i++) {
        const viewToShow = views[i].id.slice(0,views[i].id.indexOf('-'))
        views[i].style.display = selected.id.includes(viewToShow) ? 'flex' : 'none'
    }
}

function previewColor() {
    elem('set-color-icon').style.color = elem('color-picker').value
}

//sets a newly selected color as the theme for the app and adds it to previously used colors
function setNewColor() {

    const newColor = elem('color-picker').value
//hexcolor is converted to rgb values in order to be accessed from the theme object
    const red = parseInt(newColor.slice(1,3),16)
    const green = parseInt(newColor.slice(3,5),16)
    const blue = parseInt(newColor.slice(5,7),16)

    theme.red = red
    theme.green = green
    theme.blue = blue

    const color = rgbToHex(red, green, blue)
    theme.color = color
    
    changeTheme(false)

    const colors = theme.customColors
    let push = true
//if the new color is already in the users previously used colors, it will not be added again
    for(let i = 0; i < colors.length; i++) {
        if(colors[i] === color) {
            push = false
            i = colors.length
        }
    }
    if(push) {
        colors.push(rgbToHex(red,green,blue))
        mapPreviousColors(colors[colors.length-1])
        for(let i = 0; i < colors.length; i++) {
            window.localStorage.setItem('saved-color-'+i, colors[i])
        }
    }
    
    window.localStorage.setItem('color', color)
    window.localStorage.setItem('red', red)
    window.localStorage.setItem('green', green)
    window.localStorage.setItem('blue', blue)
}

//sets a previous color as the current theme
function setOldColor(element) {
    const color = element.children[0].value
    const red = parseInt(color.slice(1,3),16)
    const green = parseInt(color.slice(3,5),16)
    const blue = parseInt(color.slice(5,7),16)

    theme.color = `rgb(${red},${green},${blue})`
    theme.red = red
    theme.green = green
    theme.blue = blue
    changeTheme(false)

    window.localStorage.setItem('color', theme.color)
    window.localStorage.setItem('red', theme.red)
    window.localStorage.setItem('green', theme.green)
    window.localStorage.setItem('blue', theme.blue)
}

//constructs an element which displays a previous color
function appendColor(color) {
    const button = create('button')
    button.title = 'Set color'
    button.className = 'quick-color'
    button.setAttribute('onclick', 'setOldColor(this)')

    const input = create('input')
    input.type = 'color'
    input.title = 'Set color'
    input.className = 'previous-color'
    input.setAttribute('value', color)
    input.disabled = true
    
    button.append(input)
    return button
}

//displays previously used colors, clicking the color sets it as the theme color, no more than 20 colors are stored
function mapPreviousColors(color) {
    const colors = theme.customColors
    if(colors.length > 20) {
        colors.shift()
        elem('previous-colors').children.item(0).remove()
    }
    elem('previous-colors').append(appendColor(color))
}

//sets changes made to the theme
//onPageLoad perameter should only be true if the function is being called when the page is first loaded, sets home button color
function changeTheme(onPageLoad) {
    const color = theme.color

    const playbackButtons = elemClass('playback-button')
    for(let i = 0; i < playbackButtons.length; i++) {
        playbackButtons[i].style.backgroundColor = color
    }

    onPageLoad ? elem('nav-bar-home').style.color = color : elem('nav-bar-palette').style.color = color
    elem('sign-out').style.color = color
    setBackground()
    changeGradientArrows()
}

//changes the background gradient of the app by using the id of the icon inside the selected gradient button
function changeGradient(element) {
    const selectedId = element.children[0].id
    theme.background.direction = selectedId.replaceAll('-', ' ')
    setBackground()
    window.localStorage.setItem('gradient', theme.background.direction)
    changeGradientArrows()
}
//sets the style of the currently selected gradient arrow button
function changeGradientArrows() {
    const arrows = elemClass('arrow-icon')
    for(let i = 0; i < arrows.length; i++) {
        arrows[i].style.color = arrows[i].id.replaceAll('-', ' ') === theme.background.direction ? theme.color : 'black'
    }
}

function setBackground() {
    document.body.style.backgroundImage = `linear-gradient(${theme.background.direction}, rgb(20,20,20), rgba(${theme.red},${theme.green},${theme.blue}, 0.2))`
}

//set color for navbar and playback icons
function setIconColor(pageLoad) {
    const playback = elemClass('playback-icon')
    for(let i = 0; i < playback.length; i++) {
        playback[i].style.color = theme.iconColor
    }
    
    const navIcons = elemClass('nav-icon')
    for(let i = 0; i < navIcons.length; i++) {
        navIcons[i].style.color = theme.iconColor
    }

    pageLoad ? elem('nav-bar-home').style.color = theme.color : elem('nav-bar-palette').style.color = theme.color
    elem('change-icon-colors').innerText = theme.iconColor === 'white' ? 'Switch to black' : 'Switch to white'
}

function switchIconColors() {
    const color = elem('play-icon').style.color === 'white' ? 'black' : 'white'
    theme.iconColor = color
    setIconColor(false)

    window.localStorage.setItem('iconColor', color)
}

//sets the theme to the default color
function setDefaultColor() {
    theme.color = theme.defautlColor
    theme.red = '75'
    theme.green = '255'
    theme.blue = '75'
    
    changeTheme(false)

    window.localStorage.setItem('color', theme.color)
    window.localStorage.setItem('red', theme.red)
    window.localStorage.setItem('green', theme.green)
    window.localStorage.setItem('blue', theme.blue)
}

//converts an rgb color to a hexcolor
function rgbToHex(r, g, b){
    const red = Number(r) < 16 ? `0${Number(r).toString(16)}` : Number(r).toString(16)
    const green = Number(g) < 16 ? `0${Number(g).toString(16)}` : Number(g).toString(16)
    const blue = Number(b) < 16 ? `0${Number(b).toString(16)}` : Number(b).toString(16)
    return '#'+red+green+blue
}

function updateHome() {
    const context = info.current.context

    const contextType = context.type.toLocaleLowerCase()
    const contextElem = elem('context')
    const header = contextType[0] === 'a' ? 'Listening to an ' : 'Listening to a '
    contextElem.innerText = contextType !== 'browsing' ? header+contextType : 'Browsing Spotify'

    const image = context.image
    const imageElem = elem('context-image')
    imageElem.src = image

    const name = context.name
    const nameElem = elem('context-name')
    nameElem.innerText = name
    nameElem.title = name

    const artist = context.artist
    elem('context-artist').innerText = artist
}

//reloads elements on the page that may be constantly changing
//function is always called every second with the getCurrent() function, as well as when
function reloadContents() {
    elem('greeting').innerText = 'Good '+getGreeting()+','
    elem('play-icon').className = info.playback.playing ? 'fa-solid fa-pause playback-icon' : 'fa-solid fa-play playback-icon'
    progressBar()
}

//reloads content on the page that should only change when a different track is played
function reloadContentsOnTrackChange() {
    updateHome()
    elem('current-track').innerText = info.current.track
    elem('current-track').title = info.current.track
    elem('current-link').href = info.current.link
    elem('current-image').src = info.current.cover
    elem('current-artist').innerText = info.current.artist
    elem('current-artist').title = info.current.artist
}

//shows the app and hides the sign in page once signed in, called upon signing in
async function showContent() {
    elem('name').innerText=info.user.display_name
    elem('user-image').src=info.user.images[0].url
    elem('sign-in').style.display='none'
    elem('app').style.display='flex'
}

function signOut() {
    document.getElementById('token-input').value = ''
    window.localStorage.removeItem('token')
    elem('app').style.display='none'
    elem('sign-in').style.display='flex'
    
}

//switches the side of the window that the entire app is aligned to
function switchAlign() {
    const bodyStyle = document.body.style
    bodyStyle.alignItems = bodyStyle.alignItems === 'flex-end' ? 'flex-start' : 'flex-end'
    elem('align-overall').style.rotate = bodyStyle.alignItems === 'flex-end' ? '270deg' : '90deg'

    window.localStorage.setItem('alignment', bodyStyle.alignItems)
}

//swaps the position of the current playback image and current playback name, artist, and playback buttons
function playbackAlign() {
    const element = elem('playing-alignment').style
    element.flexDirection = element.flexDirection === 'row-reverse' ? 'row' : 'row-reverse' 
    elem('current-words').style.marginLeft = element.flexDirection === 'row-reverse' ? '0' : '1vh'

    window.localStorage.setItem('playback-align', element.flexDirection)
}

//swaps the side of the app that the navbar is aligned to
function navbarAlign() {
    const element = elem('actions').style
    element.flexDirection = element.flexDirection === 'row-reverse' ? 'row' : 'row-reverse'

    window.localStorage.setItem('navbar-align', element.flexDirection)
}


let called = false
let leftHeight
let middleHeight
let rightHeight
//if direction is positive, bars will move upwards, they will move downwards if negative
let leftDirection = 1
let middleDirection = 1
let rightDirection = 1

function playAnimation() {
    const canvas = document.querySelector('#playing-animation')
    const c = canvas.getContext('2d')
    
    const minHeight = canvas.height/5
    const maxHeight = canvas.height
    
    if(!called) {
        leftHeight = canvas.height
        middleHeight = canvas.height/2
        rightHeight = canvas.height/5
        called = true
    } else {
        if(rightHeight > maxHeight || rightHeight < minHeight) {rightDirection = -rightDirection}
        rightHeight += rightDirection

        if(middleHeight > maxHeight || middleHeight < minHeight) {middleDirection = -middleDirection}
        middleHeight += middleDirection

        if(leftHeight > maxHeight || leftHeight < minHeight) {leftDirection = -leftDirection}
        leftHeight += leftDirection
    }

    const collumWidth = canvas.width/5

    c.beginPath()
    c.clearRect(0,0,canvas.width,canvas.height)
    c.fillStyle = theme.color
    c.fillRect(collumWidth*0,0,collumWidth, rightHeight)
    c.fillRect(collumWidth*2,0,collumWidth, middleHeight)
    c.fillRect(collumWidth*4,0,collumWidth, leftHeight)
    c.stroke()
}