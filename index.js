
let token = null

let info = {
    user: '',
    current: {
        data: '',
        track: '',
        artist: '',
        cover: '',
        link: '',
        position: '',
        length: ''
    },
    playback: {
        data: '',
        playing: ''
    },
}

let theme = {
    defautlColor: 'rgb(75, 255, 75)',
    customColors: [],
    color: '',
    red: '',
    green: '',
    blue: '',
    background: {
        type:'linear-gradient',
        direction:'to right',
    }
}

function elem(elementId) {
    return document.getElementById(elementId)
}
function elemClass(className) {
    return document.getElementsByClassName(className)
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

function pageLoad() {
    const storedToken = window.localStorage.getItem('token')
    if(storedToken !== null) {
        document.getElementById('token-input').value = storedToken
        signIn()
    }
}

async function signIn() {
    const inputToken = document.getElementById('token-input').value

    const result = await fetch('https://api.spotify.com/v1/me', {
        method: 'GET',
        headers: {'Authorization' : 'Bearer ' + inputToken}
    })
    const data = await result.json()

    if(data.display_name !== undefined) {
        token = inputToken
        info.user = data
        window.localStorage.setItem('token', token)

        const playing = await get('https://api.spotify.com/v1/me/player')
        playing.is_playing ? info.playback.playing = true : info.playback.playing = false

        getCurrent()
        showContent()
        
    } else {
        console.log('invalid access token')
        window.localStorage.removeItem('token')
        elem('token-input').value = ''
    }

}

async function getCurrent() {
    const playing = await get('https://api.spotify.com/v1/me/player')
    if(playing.is_playing) {
        info.playback.playing = true
        const data = await get('https://api.spotify.com/v1/me/player/currently-playing')

        info.current.data = data
        info.current.track = data.item.name
        info.current.artist = data.item.artists[0].name
        info.current.cover = data.item.album.images[1].url
        info.current.link = data.item.external_urls.spotify
        info.current.length = data.item.duration_ms
        info.current.position = data.progress_ms        

    } else {info.playback.playing = false}

    reloadContents()
}
setInterval(getCurrent, 1000)

async function getQueue() {
    const data = await get('https://api.spotify.com/v1/me/player/queue')
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

function setView(element) {
    const buttons = elemClass('nav-icon')
    const selected = element.children[0]

    for(let i = 0; i < buttons.length; i++) {
        buttons[i].style.color = buttons[i].id === selected.id ? theme.color : 'black'
    }
}

function setNewColor() {
    const newColor = elem('color-picker').value
    const red = parseInt(newColor.slice(1,3),16)
    const green = parseInt(newColor.slice(3,5),16)
    const blue = parseInt(newColor.slice(5,7),16)

    theme.red = red
    theme.green = green
    theme.blue = blue

    const color = `rgb(${red},${green},${blue})`
    theme.color = color
    theme.customColors.push({color,red,green,blue})

    changeTheme()
}

function changeTheme() {
    const color = theme.color

    const playbackButtons = elemClass('playback-button')
    for(let i = 0; i < playbackButtons.length; i++) {
        playbackButtons[i].style.backgroundColor = color
    }

    elem('nav-bar-palette').style.color = color
    setBackground()
}

function setBackground() {
    document.body.style.backgroundImage = `${theme.background.type}(${theme.background.direction}, rgb(20,20,20), rgba(${theme.red},${theme.green},${theme.blue}, 0.2))`
}

function reloadContents() {
    elem('greeting').innerText = 'Good '+getGreeting()+','
    elem('current-track').innerText = info.current.track.length > 25 ? info.current.track.slice(0,25) + '...' : info.current.track
    elem('current-track').title = info.current.track
    elem('current-link').href = info.current.link
    elem('current-image').src = info.current.cover
    elem('current-artist').innerText = info.current.artist
    elem('play-icon').className = info.playback.playing ? 'fa-solid fa-pause playback-icon' : 'fa-solid fa-play playback-icon'
    progressBar()
}

async function showContent() {
    elem('name').innerText=info.user.display_name
    await getQueue()
    elem('app').style.display='flex'
    elem('sign-in').style.display='none'
}

function signOut() {
    document.getElementById('token-input').value = ''
    window.localStorage.removeItem('token')
    elem('app').style.display='none'
    elem('sign-in').style.display='flex'
    
}

function switchAlign() {
    document.body.style.alignItems = document.body.style.alignItems === 'flex-end' ? 'flex-start' : 'flex-end'
}

function switchFlexDirection() {
    const items = elemClass('flex-direction')

    for(let i = 0; i< items.length; i++) {
        const direction = items[i].style.flexDirection
        items[i].style.flexDirection = direction === 'row-reverse' ? 'row' : 'row-reverse'
    }
    elem('current-words').style.marginLeft = items[0].style.flexDirection === 'row-reverse' ? '0' : '1vh'
}