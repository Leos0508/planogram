import { DragSku } from "@/hooks/use-planogram-drag";
import { Sku } from "@/lib/skus/queries";

export default function SkuCard({
  sku,
  onPointerDown,
}: {
  sku: Sku;
  onPointerDown: (sku: DragSku, event: React.PointerEvent) => void;
}) {
  return (
    <div
      className="flex w-[120px] shrink-0 cursor-grab flex-col items-center gap-2 border bg-card p-3 text-card-foreground hover:bg-accent hover:text-accent-foreground active:cursor-grabbing"
      onPointerDown={(event) =>
        onPointerDown(
          {
            id: sku.id,
            name: sku.name,
            width: sku.width,
            height: sku.height,
          },
          event,
        )
      }
    >
      <div
        className="size-10 overflow-hidden rounded-md border border-border/60"
        style={sku.imageUrl ? undefined : { backgroundColor: sku.color }}
      >
        {sku.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={sku.imageUrl}
            alt=""
            className="size-full object-cover"
          />
        ) : (
          <span className="sr-only">Color {sku.color}</span>
        )}
      </div>
      <p className="line-clamp-1 text-center text-sm">{sku.name}</p>
    </div>
  );
}
