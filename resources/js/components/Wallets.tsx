import { Wallet } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';

type Wallet = {
    id: string;
    name: string;
    balance: number;
    currency: string;
    type: string;
};

type WalletsProps = {
    balance: number;
    availableBalance?: number;
    wallets: Wallet[];
    onDeposit: (walletId: string) => void;
};

export default function Wallets({ wallets, onDeposit }: WalletsProps) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Wallet className="h-5 w-5" />
                    My Wallets
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {wallets.map((wallet) => (
                        <div key={wallet.id} className="flex items-center justify-between rounded-lg border p-4">
                            <div>
                                <h4 className="font-medium">{wallet.name}</h4>
                                <p className="text-sm text-muted-foreground">
                                    {wallet.currency} {wallet.balance.toLocaleString()}
                                </p>
                            </div>
                            <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => onDeposit(wallet.id)}
                            >
                                Add Funds
                            </Button>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
