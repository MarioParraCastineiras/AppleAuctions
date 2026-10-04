import { httpDelete, httpGet, httpPost, httpPut } from './httpClient'

function authOptions(token) {
  if (!token) {
    return {}
  }

  return {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  }
}

export async function fetchAuctions() {
  return httpGet('/auctions')
}

export async function fetchAuctionById(auctionId) {
  return httpGet(`/auctions/${auctionId}`)
}

export async function createAuction(payload, token) {
  return httpPost('/auctions', payload, authOptions(token))
}

export async function updateAuction(auctionId, payload, token) {
  return httpPut(`/auctions/${auctionId}`, payload, authOptions(token))
}

export async function deleteAuction(auctionId, token) {
  return httpDelete(`/auctions/${auctionId}`, authOptions(token))
}

export async function placeBid(auctionId, amount, token) {
  return httpPost(
    `/auctions/${auctionId}/bids`,
    { amount },
    authOptions(token),
  )
}

export async function uploadAuctionImage(file, productId, token) {
  const formData = new FormData()
  formData.append('image', file)

  if (productId) {
    formData.append('productId', productId)
  }

  return httpPost('/auctions/upload-image', formData, authOptions(token))
}
