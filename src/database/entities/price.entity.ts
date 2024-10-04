import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity()
export class Price {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  chain: string;

  @Column('float')
  price: number;

  @CreateDateColumn()
  createdAt: Date;
}
