import Image from 'next/image'
import React from 'react'

const Loading = () => {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
        <Image src="/loading.svg" alt="Loading" width={100} height={100} />
    </div>
  )
}

export default Loading
