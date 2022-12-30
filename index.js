
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
    }
}

function elem(elementId) {
    return document.getElementById(elementId)
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
    const items = document.getElementsByClassName('align-items')

    for (let i = 0; i < items.length; i++) {
        const align = items[i].style.alignItems
        
        items[i].style.alignItems = align === 'flex-end' ? 'flex-start' : 'flex-end'
    }
}

function switchFlexDirection() {
    const items = document.getElementsByClassName('flex-direction')

    for(let i = 0; i< items.length; i++) {
        const direction = items[i].style.flexDirection
        items[i].style.flexDirection = direction === 'row-reverse' ? 'row' : 'row-reverse'
    }
}