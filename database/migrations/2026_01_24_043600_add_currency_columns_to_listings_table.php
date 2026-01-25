<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // First, rename the existing currency column to from_currency
        if (Schema::hasColumn('listings', 'currency')) {
            Schema::table('listings', function (Blueprint $table) {
                $table->renameColumn('currency', 'from_currency');
            });
        }

        // Then add the to_currency column with a default value
        Schema::table('listings', function (Blueprint $table) {
            $table->string('to_currency', 3)->default('USD')->after('from_currency');
        });

        // Update existing records to have a default value for to_currency
        if (Schema::hasColumn('listings', 'from_currency')) {
            DB::table('listings')->whereNull('from_currency')->update(['from_currency' => 'USD']);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // First drop the to_currency column
        if (Schema::hasColumn('listings', 'to_currency')) {
            Schema::table('listings', function (Blueprint $table) {
                $table->dropColumn('to_currency');
            });
        }

        // Then rename from_currency back to currency if it exists
        if (Schema::hasColumn('listings', 'from_currency')) {
            Schema::table('listings', function (Blueprint $table) {
                $table->renameColumn('from_currency', 'currency');
            });
        }
    }
};
