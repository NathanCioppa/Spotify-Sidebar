
let token = null

let info = {
    user: '',
    current: {
        data: '',
        track: '',
        artist: '',
        cover: ''
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
        getCurrent()
        showContent()
        
    } else {
        console.log('invalid access token')
    }

}

async function getCurrent() {
    const data = await get('https://api.spotify.com/v1/me/player/currently-playing')

    info.current.data = data
    info.current.track = data.item.name
    info.current.artist = data.item.artists[0].name
    info.current.cover = data.item.album.images[1].url
}
setInterval(getCurrent, 1000)

async function getQueue() {
    const data = await get('https://api.spotify.com/v1/me/player/queue')
    console.log(data)
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
    data ? pause() : pauseResume()
}

async function pause() {
    try {
        await fetch('https://api.spotify.com/v1/me/player/pause', {
        method: 'PUT',
        headers: {
            'Authorization' : 'Bearer ' + token}
    })
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
    } catch (error) {
        console.log('error resume')
    }
}

function reloadContents() {
    elem('current-track').innerText = info.current.track
    elem('current-image').src = info.current.cover
    elem('current-artist').innerText = info.current.artist
}
setInterval(reloadContents, 1000)

async function showContent() {
    elem('title').innerText=info.user.display_name
    await getQueue()
    elem('app').style.display='flex'
    elem('sign-in').style.display='none'
}

function signOut() {
    elem('app').style.display='none'
    elem('sign-in').style.display='flex'
}