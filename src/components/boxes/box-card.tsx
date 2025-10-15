import type { KeyboardEvent } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface BoxCardProps {
  box: {
    box_no: number
    description: string
    capacity: number
    total_locations?: number
    occupied_locations?: number
    available_locations?: number
    usage_percentage?: number
  }
  onOpen: () => void
  disabled?: boolean
}

export function BoxCard({ box, onOpen, disabled = false }: BoxCardProps) {
  const handleSelect = () => {
    if (disabled) {
      return
    }
    onOpen()
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      handleSelect()
    }
  }

  return (
    <Card
      variant="content"
      className={`group transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${disabled ? 'pointer-events-none opacity-60' : 'cursor-pointer'}`}
      data-testid={`boxes.list.item.${box.box_no}`}
      data-box-no={box.box_no}
      tabIndex={disabled ? -1 : 0}
      role="button"
      aria-disabled={disabled}
      aria-label={`Open box ${box.box_no}`}
      onClick={handleSelect}
      onKeyDown={handleKeyDown}
    >
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-base">#{box.box_no} {box.description}</CardTitle>
          </div>
          <div className="text-right">
            <div className="text-sm font-medium">{box.capacity} locations</div>
            <div className="text-xs text-muted-foreground">capacity</div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="flex justify-between items-center">
          <div className="text-sm text-muted-foreground">
            Usage: {box.occupied_locations ?? 0}/{box.total_locations ?? box.capacity} ({Math.round(box.usage_percentage ?? 0)}%)
          </div>
        </div>
        
        <div className="mt-3 bg-muted rounded-full h-2">
          <div 
            className="bg-primary h-2 rounded-full transition-all duration-300" 
            style={{ width: `${Math.min(box.usage_percentage ?? 0, 100)}%` }}
          />
        </div>
      </CardContent>
    </Card>
  )
}
