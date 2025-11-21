import { useDroppable } from "@dnd-kit/core";

interface DroppableProps {
  id: string;
  children: React.ReactNode;
}

export function Droppable({ id, children }: DroppableProps) {
  const { setNodeRef, isOver } = useDroppable({
    id,
  });

  const style = {
    backgroundColor: isOver ? "rgba(6, 182, 212, 0.1)" : undefined,
    transition: "background-color 0.2s ease",
  };

  return (
    <div ref={setNodeRef} style={style} className="rounded-lg">
      {children}
    </div>
  );
}
