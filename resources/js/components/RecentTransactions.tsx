import { ArrowDown, ArrowUp, Clock, Check, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

type Transaction = {
    id: string;
    description: string;
    amount: number;
    type: 'credit' | 'debit';
    status: 'completed' | 'pending' | 'failed';
    date: string;
};

type RecentTransactionsProps = {
    transactions: Transaction[];
};

export default function RecentTransactions({ transactions }: RecentTransactionsProps) {
    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'completed':
                return <Check className="h-4 w-4 text-green-500" />;
            case 'pending':
                return <Clock className="h-4 w-4 text-yellow-500" />;
            case 'failed':
                return <X className="h-4 w-4 text-red-500" />;
            default:
                return null;
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Recent Transactions
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {transactions.map((transaction) => (
                        <div key={transaction.id} className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="rounded-full bg-muted p-2">
                                    {transaction.type === 'credit' ? (
                                        <ArrowDown className="h-4 w-4 text-green-500" />
                                    ) : (
                                        <ArrowUp className="h-4 w-4 text-red-500" />
                                    )}
                                </div>
                                <div>
                                    <h4 className="font-medium">{transaction.description}</h4>
                                    <p className="text-sm text-muted-foreground">
                                        {new Date(transaction.date).toLocaleDateString()}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className={`font-medium ${transaction.type === 'credit' ? 'text-green-600' : 'text-red-600'}`}>
                                    {transaction.type === 'credit' ? '+' : '-'}${Math.abs(transaction.amount).toFixed(2)}
                                </span>
                                {getStatusIcon(transaction.status)}
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
