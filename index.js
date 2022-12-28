
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
    const result = await fetch(endpoint, {
        method: 'GET',
        headers: {'Authorization' : 'Bearer ' + token}
    })
    return await result.json()
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
    
    //try {
    //    const result = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
    //    method: 'GET',
    //    headers: {'Authorization' : 'Bearer ' + token}
    //})
    //const data = await result.json()
    //info.current.data = data
    //info.current.track = data.item.name
    //info.current.artist = data.item.artists[0].name
    //info.current.cover = data.item.album.images[1].url
//
    //} catch (error) {
    //    console.log('error getting current')
    //}
}
setInterval(getCurrent, 1000)

async function getQueue() {
    try {
        const result = await fetch('https://api.spotify.com/v1/me/player/queue', {
        method: 'GET',
        headers: {
            'Authorization' : 'Bearer ' + token}
    })
    const data = await result.json()
    console.log(data)
    } catch (error) {
        console.log('queue error')
    }
}

async function next() {
    try {
        await fetch('https://api.spotify.com/v1/me/player/next', {
        method: 'POST',
        headers: {'Authorization' : 'Bearer ' + token}
    })
    await getCurrent()
    reloadContents()
    } catch (error) {
        console.log('error next')
    }
}

async function previous() {
    try {
        await fetch('https://api.spotify.com/v1/me/player/previous', {
        method: 'POST',
        headers: {'Authorization' : 'Bearer ' + token}
    })
    await getCurrent()
    reloadContents()
    } catch (error) {
        console.log('error previous')
    }
}

async function pauseResume() {
    try {
        const result = await fetch('https://api.spotify.com/v1/me/player', {
        method: 'GET',
        headers: {
            'Authorization' : 'Bearer ' + token}
    })
    const data = await result.json()
    data ? pause() : pauseResume()
    } catch (error) {
        console.log('error pause/resume')
    }
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
    document.getElementById('title').innerText=info.user.display_name
    await getQueue()
    document.getElementById('app').style.display='flex'
    document.getElementById('sign-in').style.display='none'
}

function signOut() {
    document.getElementById('app').style.display='none'
    document.getElementById('sign-in').style.display='flex'
}