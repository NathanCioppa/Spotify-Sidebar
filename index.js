
let token = null

let info = {
    user: '',
    current: {
        data: '',
        track: 'Play something on Spotify',
        artist: 'Then it will show up here',
        cover: 'https://www.hypebot.com/wp-content/uploads/2019/11/spotify-1759471_1920.jpg',
        link: '',
        position: '',
        length: ''
    },
    playback: {
        data: '',
        playing: false
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
function getLocal(key) {
    return window.localStorage.getItem(key)
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
    if(getLocal('color') !== null) {
        theme.color = getLocal('color')
        theme.red = getLocal('red')
        theme.green = getLocal('green')
        theme.blue = getLocal('blue')

        const red = Number(theme.red) < 16 ? `0${Number(theme.red).toString(16)}` : Number(theme.red).toString(16)
        const green = Number(theme.green) < 16 ? `0${Number(theme.green).toString(16)}` : Number(theme.green).toString(16)
        const blue = Number(theme.blue) < 16 ? `0${Number(theme.blue).toString(16)}` : Number(theme.blue).toString(16)

        elem('color-picker').value = `#${red}${green}${blue}`
        elem('set-color-icon').style.color = `#${red}${green}${blue}`

        changeTheme(true)
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
        info.playback.playing = playing === undefined ? false : playing.is_playing ? true : false
        
        getCurrent()
        showContent()
        setInterval(getCurrent, 1000)
    } else {
        console.log('invalid access token')
        window.localStorage.removeItem('token')
        elem('token-input').value = ''
    }
}

async function getCurrent() {
    const playing = await get('https://api.spotify.com/v1/me/player')
    if(playing === undefined) return;
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
        const color = theme.color === '' ? theme.defautlColor : theme.color
        buttons[i].style.color = buttons[i].id === selected.id ? color : 'black'
    }

    const views = elemClass('view-div')
    for (let i = 0; i < views.length; i++) {
        const viewToShow = views[i].id.slice(0,views[i].id.indexOf('-'))
        views[i].style.display = selected.id.includes(viewToShow) ? 'flex' : 'none'
    }
}

function mapPreviousColors() {
    const colors = theme.customColors
    createColorToAppend()
}

function createColorToAppend() {
    const button = document.createElement('button')
    button.title = 'Set color'
    button.className = 'quick-color'
    button.setAttribute('onclick', 'setOldColor(this)')

    const input = document.createElement('input')
    input.type = 'color'
    input.title = 'Set color'
    input.className = 'previous-color'
    input.setAttribute('value', rgbToHex(theme.red, theme.green, theme.blue))
    input.disabled = true
    
    button.append(input)
    elem('previous-colors').append(button)
}

function previewColor() {
    elem('set-color-icon').style.color = elem('color-picker').value
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
    
    changeTheme(false)

    let push = true
    for(let i = 0; i < theme.customColors.length; i++) {
        if(theme.customColors[i].color === color) {
            push = false
            i = theme.customColors.length
        }
    }
    if(push) {
        theme.customColors.push({color,red,green,blue})
        mapPreviousColors()
    }
    
    window.localStorage.setItem('color', color)
    window.localStorage.setItem('red', red)
    window.localStorage.setItem('green', green)
    window.localStorage.setItem('blue', blue)
}

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

function changeTheme(onPageLoad) {
    const color = theme.color

    const playbackButtons = elemClass('playback-button')
    for(let i = 0; i < playbackButtons.length; i++) {
        playbackButtons[i].style.backgroundColor = color
    }

    onPageLoad ? elem('nav-bar-home').style.color = color : elem('nav-bar-palette').style.color = color
    setBackground()
}

function setBackground() {
    document.body.style.backgroundImage = `${theme.background.type}(${theme.background.direction}, rgb(20,20,20), rgba(${theme.red},${theme.green},${theme.blue}, 0.2))`
}

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

function rgbToHex(r, g, b){
    const red = Number(r) < 16 ? `0${Number(r).toString(16)}` : Number(r).toString(16)
    const green = Number(g) < 16 ? `0${Number(g).toString(16)}` : Number(g).toString(16)
    const blue = Number(b) < 16 ? `0${Number(b).toString(16)}` : Number(b).toString(16)
    return '#'+red+green+blue
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
    elem('sign-in').style.display='none'
    elem('app').style.display='flex'
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
    elem('playback').style.marginLeft = items[0].style.flexDirection === 'row-reverse' ? '0' : '1vh'
}