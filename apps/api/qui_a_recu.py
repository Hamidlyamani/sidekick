"""
Qui a reçu une réponse du bot, et quoi exactement.

À lancer après un envoi accidentel, pour savoir précisément à qui présenter
des excuses et ce qui leur a été dit.

    python qui_a_recu.py
    python qui_a_recu.py --details      # avec le texte complet des échanges
"""

from __future__ import annotations

import asyncio
import sys

from sqlalchemy import select

from app.db import SessionLocal
from app.models import Message, Profil, Role


async def main(details: bool = False) -> None:
    async with SessionLocal() as session:
        profils = (await session.execute(select(Profil).order_by(Profil.date_creation))).scalars().all()

        if not profils:
            print("Aucun contact en base : le bot n'a répondu à personne.")
            return

        total_envoyes = 0
        print(f"{len(profils)} contact(s) ont écrit au bot.\n")

        for p in profils:
            msgs = (
                await session.execute(
                    select(Message)
                    .where(Message.profil_id == p.id)
                    .order_by(Message.created_at)
                )
            ).scalars().all()

            envoyes = [m for m in msgs if m.role is Role.assistant]
            total_envoyes += len(envoyes)

            numero = p.whatsapp_id.split("@")[0]
            etiquette = f"  {numero}"
            if p.nom:
                etiquette += f"  ({p.nom})"
            print(f"{etiquette}  — {len(envoyes)} réponse(s) envoyée(s), premier contact {p.date_creation:%d/%m %H:%M}")

            if details:
                for m in msgs:
                    sens = "→ BOT" if m.role is Role.assistant else "← eux"
                    texte = m.contenu.replace("\n", " ")
                    if len(texte) > 160:
                        texte = texte[:160] + "…"
                    print(f"       {m.created_at:%H:%M} {sens} : {texte}")
                print()

        print(f"\nTotal : {total_envoyes} message(s) envoyé(s) par le bot à {len(profils)} contact(s).")
        if not details:
            print("Relance avec --details pour voir le contenu exact de chaque échange.")


if __name__ == "__main__":
    asyncio.run(main(details="--details" in sys.argv))
