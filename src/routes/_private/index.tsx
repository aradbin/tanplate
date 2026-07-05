import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_private/')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/_private/"!</div>
}
