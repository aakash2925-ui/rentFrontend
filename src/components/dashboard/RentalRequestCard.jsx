"use client";

import Link from "next/link";
import { CalendarDays, IndianRupee, MapPin, PackageCheck, Phone, Truck, UserRound } from "lucide-react";
import { quantityOf } from "@/lib/itemFields";
import { statusDescriptions, statusLabel, statusOptions, statusTone } from "@/lib/rentalStatus";

const formatDate = (date) => date ? new Date(date).toLocaleDateString() : "-";

export default function RentalRequestCard({ request, onStatusChange, showUser = false, showAvailable = false }) {
  const item = request.property;
  const isDelivery = request.deliveryOption === "delivery";

  return (
    <article className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-800 dark:bg-stone-900">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            {item?._id ? (
              <Link href={`/items/${item._id}`} className="text-base font-black hover:text-meadow">
                {item.title}
              </Link>
            ) : (
              <strong className="text-base">Deleted item</strong>
            )}
            <span className={`rounded-full px-2 py-1 text-xs font-bold ${statusTone[request.status]}`}>
              {statusLabel(request.status)}
            </span>
          </div>
          <p className="mt-1 text-xs text-stone-500">{statusDescriptions[request.status]}</p>
        </div>
        {onStatusChange && (
          <select className="field md:max-w-52" value={request.status} onChange={(event) => onStatusChange(request._id, event.target.value)}>
            {statusOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        )}
      </div>

      <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-4">
        {showUser && (
          <InfoTile icon={UserRound} label="Renter" value={request.user?.name || "User"} subValue={request.user?.email} />
        )}
        <InfoTile icon={Phone} label="Phone" value={request.user?.phone || request.phone || "-"} />
        <InfoTile icon={CalendarDays} label="Rental dates" value={`${formatDate(request.startDate)} - ${formatDate(request.endDate)}`} subValue={`${request.rentalDays || "-"} day(s)`} />
        <InfoTile icon={PackageCheck} label="Quantity" value={`${request.quantity || 1} item(s)`} subValue={showAvailable ? `Available now: ${quantityOf(item) || 0}` : undefined} />
        <InfoTile icon={IndianRupee} label="Total" value={`₹${Number(request.totalAmount || 0).toLocaleString()}`} />
      </div>

      <div className="mt-3 rounded-lg bg-mist p-3 text-sm dark:bg-stone-800">
        <div className="flex items-start gap-2">
          {isDelivery ? <Truck className="mt-0.5 h-4 w-4 text-meadow" /> : <MapPin className="mt-0.5 h-4 w-4 text-meadow" />}
          <div>
            <strong>{isDelivery ? "Delivery requested" : "Pickup selected"}</strong>
            <p className="mt-1 text-stone-600 dark:text-stone-300">
              {isDelivery
                ? request.deliveryAddress || "No address"
                : "User will coordinate pickup from the listed pickup point."}
            </p>
          </div>
        </div>
      </div>

      {request.message && <p className="mt-3 text-sm leading-6 text-stone-600 dark:text-stone-300">{request.message}</p>}
    </article>
  );
}

function InfoTile({ icon: Icon, label, value, subValue }) {
  return (
    <div className="rounded-lg border border-stone-200 bg-mist p-3 dark:border-stone-800 dark:bg-stone-800">
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-stone-500">
        <Icon className="h-4 w-4 text-clay" />
        {label}
      </div>
      <p className="mt-2 font-semibold">{value}</p>
      {subValue && <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">{subValue}</p>}
    </div>
  );
}
