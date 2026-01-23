<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        // Drop the foreign key constraint first
        Schema::table('transactions', function (Blueprint $table) {
            $table->dropForeign(['wallet_id']);
        });

        // Then modify the column to be a string
        Schema::table('transactions', function (Blueprint $table) {
            $table->string('wallet_id')->change();
        });
    }

    public function down()
    {
        // Convert back to integer for rollback
        Schema::table('transactions', function (Blueprint $table) {
            $table->unsignedBigInteger('wallet_id')->change();
            
            // Re-add the foreign key constraint
            $table->foreign('wallet_id')
                  ->references('id')
                  ->on('wallets')
                  ->onDelete('cascade');
        });
    }
};