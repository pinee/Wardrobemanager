import React from 'react'

export const Toast: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="fixed bottom-4 right-4 z-50">
      {children}
    </div>
  )
}