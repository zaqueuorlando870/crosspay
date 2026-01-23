import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { type BreadcrumbItem } from '@/types';
import { Transition } from '@headlessui/react';
import { useState } from 'react';

// Components
import DeleteUser from '@/components/delete-user';
import HeadingSmall from '@/components/heading-small';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';
import { edit } from '@/routes/profile';

// Types
type Currency = {
    [key: string]: string;
};

type PageProps = {
    mustVerifyEmail: boolean;
    status?: string;
    auth: {
        user: {
            name: string;
            email: string;
            currency?: string;
            email_verified_at: string | null;
        };
    };
    currencies: Currency;
};

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Profile settings',
        href: edit().url,
    },
];

export default function Profile({ 
    mustVerifyEmail, 
    status, 
    auth, 
    currencies = { 'USD': 'US Dollar' } 
}: PageProps) {
    const { data, setData, post, processing, errors, recentlySuccessful } = useForm({
        _method: 'PATCH',
        name: auth.user.name,
        email: auth.user.email,
        currency: auth.user.currency || 'USD',
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        
        // Using the post method from useForm which is already bound to the form
        post('/settings/profile', {
            preserveScroll: true,
            onSuccess: () => {
                // Handle successful update if needed
            },
            onError: (errors) => {
                console.log('Form submission errors:', errors);
            },
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Profile settings" />

            <SettingsLayout>
                <div className="space-y-6">
                    <HeadingSmall
                        title="Profile information"
                        description="Update your name, email, and preferred currency"
                    />

                    <form onSubmit={submit} method="POST" className="space-y-6">
                        <div className="grid gap-4">
                            <div>
                                <Label htmlFor="name">Name</Label>
                                <Input
                                    id="name"
                                    type="text"
                                    value={data.name}
                                    onChange={(e) => setData('name', e.target.value)}
                                    className="mt-1 block w-full"
                                    autoComplete="name"
                                />
                                <InputError message={errors.name} className="mt-2" />
                            </div>

                            <div>
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={data.email}
                                    onChange={(e) => setData('email', e.target.value)}
                                    className="mt-1 block w-full"
                                    autoComplete="username"
                                />
                                <InputError message={errors.email} className="mt-2" />
                            </div>

                            <div>
                                <Label htmlFor="currency">Preferred Currency</Label>
                                <Select
                                    value={data.currency}
                                    onValueChange={(value) => setData('currency', value)}
                                >
                                    <SelectTrigger className="mt-1 w-full">
                                        <SelectValue placeholder="Select currency" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {Object.entries(currencies).map(([code, name]) => (
                                            <SelectItem key={code} value={code}>
                                                {name} ({code})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <InputError message={errors.currency} className="mt-2" />
                            </div>

                            {mustVerifyEmail && auth.user.email_verified_at === null && (
                                <div>
                                    <p className="text-sm text-muted-foreground">
                                        Your email address is unverified.{" "}
                                        <Link
                                            href="/email/verification-notification"
                                            method="post"
                                            as="button"
                                            className="text-foreground underline decoration-neutral-300 underline-offset-4 transition-colors duration-300 ease-out hover:decoration-current! dark:decoration-neutral-500"
                                        >
                                            Click here to resend the verification email.
                                        </Link>
                                    </p>

                                    {status === 'verification-link-sent' && (
                                        <div className="mt-2 text-sm font-medium text-green-600">
                                            A new verification link has been sent to your email address.
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="flex items-center gap-4">
                            <Button
                                type="submit"
                                disabled={processing}
                                data-test="update-profile-button"
                            >
                                {processing ? 'Saving...' : 'Save'}
                            </Button>

                            <Transition
                                show={recentlySuccessful}
                                enter="transition ease-in-out"
                                enterFrom="opacity-0"
                                leave="transition ease-in-out"
                                leaveTo="opacity-0"
                            >
                                <p className="text-sm text-neutral-600">
                                    Saved
                                </p>
                            </Transition>
                        </div>
                    </form>
                </div>

                <DeleteUser />
            </SettingsLayout>
        </AppLayout>
    );
}