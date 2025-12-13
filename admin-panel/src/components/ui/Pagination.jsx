import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "./button";

export function Pagination({ currentPage, totalPages, onPageChange }) {
    if (totalPages <= 1) return null;

    return (
        <div className="flex items-center justify-end space-x-2 py-4">
            <div className="flex-1 text-sm text-muted-foreground">
                Página {currentPage} de {totalPages}
            </div>
            <div className="space-x-2">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage <= 1}
                >
                    <ChevronLeft className="h-4 w-4 mr-2" />
                    Anterior
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage >= totalPages}
                >
                    Próxima
                    <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
            </div>
        </div>
    );
}
