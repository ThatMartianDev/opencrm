"use client";

import { useState, useRef, useEffect } from "react";

import Styles from "./KanbanBoard.module.css";

export type KanbanColumn = {
    id: string;
    title: string;
    color: string;
    className?: React.HTMLAttributes<HTMLDivElement>["className"];
    cards?: Array<{ id: string; element: React.ReactNode }>;
};

type KanbanBoardProps = {
    columns: KanbanColumn[];
    onCardMove?: (cardId: string, fromColumnId: string, toColumnId: string) => Promise<boolean>;
};

const KanbanBoard = ({ columns, onCardMove }: KanbanBoardProps) => {
    const [columnsState, setColumnsState] = useState<KanbanColumn[]>(columns);
    const [draggedCard, setDraggedCard] = useState<{ cardId: string; fromColumnId: string } | null>(null);
    const [dropTargetId, setDropTargetId] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const dragImageRef = useRef<HTMLDivElement | null>(null);

    // Sync internal state when columns prop changes (e.g. after async data load)
    useEffect(() => {
        if (!isProcessing) {
            setColumnsState(columns);
        }
    }, [columns]);

    const handleDragStart = (e: React.DragEvent<HTMLDivElement>, cardId: string, fromColumnId: string) => {
        setDraggedCard({ cardId, fromColumnId });
        e.dataTransfer.effectAllowed = "move";

        // Use the dragged element as the drag image
        const target = e.currentTarget;
        e.dataTransfer.setDragImage(target, target.offsetWidth / 2, 20);
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>, columnId: string) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        setDropTargetId(columnId);
    };

    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        // Only clear if leaving the column entirely (not entering a child)
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
            setDropTargetId(null);
        }
    };

    const handleDragEnd = () => {
        setDraggedCard(null);
        setDropTargetId(null);
    };

    const handleDrop = async (toColumnId: string) => {
        if (!draggedCard || draggedCard.fromColumnId === toColumnId) {
            setDraggedCard(null);
            setDropTargetId(null);
            return;
        }

        const { cardId, fromColumnId } = draggedCard;

        // Optimistic update: move card immediately
        const previousState = columnsState;
        const movedCard = columnsState
            .find((col) => col.id === fromColumnId)
            ?.cards?.find((card) => card.id === cardId);

        if (!movedCard) {
            setDraggedCard(null);
            setDropTargetId(null);
            return;
        }

        setColumnsState((prev) =>
            prev.map((col) => {
                if (col.id === fromColumnId) {
                    return { ...col, cards: col.cards?.filter((c) => c.id !== cardId) };
                }
                if (col.id === toColumnId) {
                    return { ...col, cards: [...(col.cards || []), movedCard] };
                }
                return col;
            })
        );

        setDraggedCard(null);
        setDropTargetId(null);

        // Confirm with callback — rollback on failure
        if (onCardMove) {
            setIsProcessing(true);
            try {
                const success = await onCardMove(cardId, fromColumnId, toColumnId);
                if (!success) {
                    setColumnsState(previousState);
                }
            } catch {
                setColumnsState(previousState);
            } finally {
                setIsProcessing(false);
            }
        }
    };

    return (
        <div className={Styles.board}>
            <div className={Styles.columns_wrapper}>
                {columnsState.map((column) => {
                    const isDropTarget = dropTargetId === column.id && draggedCard?.fromColumnId !== column.id;
                    const cardCount = column.cards?.length || 0;

                    return (
                        <div
                            key={column.id}
                            className={`${Styles.column} ${column.className || ""} ${isDropTarget ? Styles.drop_target : ""}`}
                            style={{ "--column-color": column.color } as React.CSSProperties}
                            onDragOver={(e) => handleDragOver(e, column.id)}
                            onDragLeave={handleDragLeave}
                            onDrop={() => handleDrop(column.id)}
                        >
                            <div className={Styles.column_header}>
                                <div className={Styles.column_color} style={{ backgroundColor: column.color }} />
                                <h3 className={Styles.column_title}>{column.title}</h3>
                                <span className={Styles.card_count}>{cardCount}</span>
                            </div>
                            <div className={Styles.cards_container}>
                                {column.cards?.map((card) => {
                                    const isDragging = draggedCard?.cardId === card.id;

                                    return (
                                        <div
                                            key={card.id}
                                            className={`${Styles.card} ${isDragging ? Styles.card_dragging : ""}`}
                                            draggable={!isProcessing}
                                            onDragStart={(e) => handleDragStart(e, card.id, column.id)}
                                            onDragEnd={handleDragEnd}
                                        >
                                            {card.element}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>
            {/* Hidden ref for custom drag images if needed */}
            <div ref={dragImageRef} style={{ position: "absolute", top: -9999 }} />
        </div>
    );
};

export default KanbanBoard;